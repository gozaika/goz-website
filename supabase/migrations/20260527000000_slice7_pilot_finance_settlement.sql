-- Slice 7: Pilot Finance & Settlement
-- Adds idempotent settlement calculation, lock/status/invoice/manual adjustment RPCs,
-- safe restaurant/admin read models, and locked-run immutability. This slice never
-- initiates Razorpay payouts, transfers, fund-account creation, captures, or refunds.

begin;

alter table restaurant_commission_plan
  add column if not exists is_default boolean not null default false;

update restaurant_commission_plan
set is_default = (plan_code = 'PILOT_0PCT_30D'),
    updated_at = now()
where plan_code in ('PILOT_0PCT_30D', 'STANDARD_12PCT', 'STANDARD_15PCT');

create unique index if not exists uq_restaurant_commission_plan_single_default
  on restaurant_commission_plan (is_default)
  where is_default;

alter table finance_settlement_run
  add column if not exists order_count integer not null default 0,
  add column if not exists excluded_order_count integer not null default 0,
  add column if not exists payment_fee_paise bigint not null default 0,
  add column if not exists adjustment_paise bigint not null default 0,
  add column if not exists calculation_version text not null default 'slice7_pilot_v1',
  add column if not exists calculation_metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists lock_reason_text text,
  add column if not exists status_note_text text,
  add column if not exists payout_provider_reference_text text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by_profile_fk uuid,
  add column if not exists cancelled_reason_text text;

alter table finance_restaurant_payout_entry
  add column if not exists line_key text,
  add column if not exists order_number text,
  add column if not exists payment_transaction_fk uuid,
  add column if not exists commission_bps integer,
  add column if not exists commission_plan_code text,
  add column if not exists source_status_code text,
  add column if not exists calculation_metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists created_by_profile_fk uuid,
  add column if not exists is_system_generated boolean not null default true;

alter table finance_invoice
  add column if not exists issued_by_profile_fk uuid,
  add column if not exists due_at timestamptz,
  add column if not exists invoice_metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists external_document_ref text,
  add column if not exists download_safe_filename text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_finance_payout_entry_payment_transaction'
      and conrelid = 'finance_restaurant_payout_entry'::regclass
  ) then
    alter table finance_restaurant_payout_entry
      add constraint fk_finance_payout_entry_payment_transaction
      foreign key (payment_transaction_fk)
      references payment_transaction (payment_transaction_pk)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_finance_payout_entry_created_by_profile'
      and conrelid = 'finance_restaurant_payout_entry'::regclass
  ) then
    alter table finance_restaurant_payout_entry
      add constraint fk_finance_payout_entry_created_by_profile
      foreign key (created_by_profile_fk)
      references iam_profile (iam_profile_pk)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_finance_invoice_issued_by_profile'
      and conrelid = 'finance_invoice'::regclass
  ) then
    alter table finance_invoice
      add constraint fk_finance_invoice_issued_by_profile
      foreign key (issued_by_profile_fk)
      references iam_profile (iam_profile_pk)
      on delete set null;
  end if;
end $$;

alter table finance_restaurant_payout_entry
  drop constraint if exists ck_finance_payout_entry_type;

alter table finance_restaurant_payout_entry
  add constraint ck_finance_payout_entry_type check (
    entry_type_code in ('ORDER_GROSS','COMMISSION','PAYMENT_FEE','TAX','REFUND','ADJUSTMENT','PAYOUT')
  );

alter table finance_settlement_run
  drop constraint if exists ck_finance_settlement_amounts;

alter table finance_settlement_run
  add constraint ck_finance_settlement_amounts check (
    gross_sales_paise >= 0
    and refund_paise >= 0
    and commission_paise >= 0
    and tax_paise >= 0
    and payment_fee_paise >= 0
    and net_payout_paise >= 0
  );

create unique index if not exists uq_finance_settlement_active_period
  on finance_settlement_run (restaurant_fk, period_start_at, period_end_at)
  where settlement_status_code <> 'CANCELLED';

create unique index if not exists uq_finance_payout_entry_run_line_key
  on finance_restaurant_payout_entry (finance_settlement_run_fk, line_key)
  where line_key is not null;

create unique index if not exists uq_finance_invoice_run
  on finance_invoice (finance_settlement_run_fk);

create index if not exists idx_slice7_finance_settlement_status
  on finance_settlement_run (settlement_status_code, created_at desc);

create index if not exists idx_slice7_finance_entry_order_type
  on finance_restaurant_payout_entry (order_fk, entry_type_code)
  where order_fk is not null;

create index if not exists idx_slice7_order_settlement_eligibility
  on order_order (restaurant_fk, pickup_window_end_at, order_status_code, payment_status_code);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_settlement_run'
      and policyname = 'p_finance_settlement_run_restaurant_select'
  ) then
    create policy p_finance_settlement_run_restaurant_select on finance_settlement_run
      for select to authenticated
      using (public.rls_has_restaurant_access(restaurant_fk));
  end if;
end $$;

create or replace function public.api_finance_is_admin(p_actor_profile_pk uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from iam_platform_membership m
    join iam_platform_role r on r.iam_platform_role_pk = m.iam_platform_role_fk
    where m.iam_profile_fk = p_actor_profile_pk
      and m.is_active
      and r.role_code in ('SUPER_ADMIN','FINANCE_ADMIN')
  )
$$;

create or replace function public.api_finance_has_platform_access(p_actor_profile_pk uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from iam_platform_membership m
    where m.iam_profile_fk = p_actor_profile_pk
      and m.is_active
  )
$$;

create or replace function public.api_finance_money_round_bps(
  p_amount_paise bigint,
  p_bps integer
)
returns bigint
language sql
immutable
as $$
  select ((greatest(coalesce(p_amount_paise, 0), 0) * greatest(coalesce(p_bps, 0), 0)::bigint) + 5000) / 10000
$$;

create or replace function public.api_finance_recalculate_run_totals(p_settlement_run_pk uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_totals record;
begin
  select
    coalesce(sum(amount_paise) filter (where entry_type_code = 'ORDER_GROSS'), 0) as gross_sales_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'REFUND'), 0)) as refund_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'COMMISSION'), 0)) as commission_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'PAYMENT_FEE'), 0)) as payment_fee_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'TAX'), 0)) as tax_paise,
    coalesce(sum(amount_paise) filter (where entry_type_code = 'ADJUSTMENT'), 0) as adjustment_paise,
    greatest(coalesce(sum(amount_paise), 0), 0) as net_payout_paise,
    count(distinct order_fk) filter (where order_fk is not null and entry_type_code = 'ORDER_GROSS') as order_count
  into v_totals
  from finance_restaurant_payout_entry
  where finance_settlement_run_fk = p_settlement_run_pk;

  update finance_settlement_run
  set gross_sales_paise = v_totals.gross_sales_paise,
      refund_paise = v_totals.refund_paise,
      commission_paise = v_totals.commission_paise,
      payment_fee_paise = v_totals.payment_fee_paise,
      tax_paise = v_totals.tax_paise,
      adjustment_paise = v_totals.adjustment_paise,
      net_payout_paise = v_totals.net_payout_paise,
      order_count = coalesce(v_totals.order_count, 0),
      updated_at = now()
  where finance_settlement_run_pk = p_settlement_run_pk;
end;
$$;

create or replace function public.api_finance_payout_account_mask(
  p_masked_account_number text,
  p_status_code text
)
returns text
language sql
stable
as $$
  select case
    when p_masked_account_number is null or length(trim(p_masked_account_number)) = 0 then concat('Not configured', case when p_status_code is not null then concat(' (', p_status_code, ')') else '' end)
    when length(p_masked_account_number) <= 8 then p_masked_account_number
    else concat(left(p_masked_account_number, 4), repeat('*', greatest(length(p_masked_account_number) - 8, 0)), right(p_masked_account_number, 4))
  end
$$;

create or replace function public.api_finance_assert_mutable_run()
returns trigger
language plpgsql
as $$
declare
  v_status text;
begin
  if TG_TABLE_NAME = 'finance_settlement_run' then
    if TG_OP = 'UPDATE'
      and old.settlement_status_code in ('LOCKED','SENT','PAID','RECONCILED')
      and (
        new.restaurant_fk is distinct from old.restaurant_fk
        or new.period_start_at is distinct from old.period_start_at
        or new.period_end_at is distinct from old.period_end_at
        or new.gross_sales_paise is distinct from old.gross_sales_paise
        or new.refund_paise is distinct from old.refund_paise
        or new.commission_paise is distinct from old.commission_paise
        or new.tax_paise is distinct from old.tax_paise
        or new.payment_fee_paise is distinct from old.payment_fee_paise
        or new.adjustment_paise is distinct from old.adjustment_paise
        or new.net_payout_paise is distinct from old.net_payout_paise
        or new.order_count is distinct from old.order_count
      )
    then
      raise exception 'settlement locked: recalculation not allowed';
    end if;
    return new;
  end if;

  if TG_OP = 'INSERT' then
    select settlement_status_code into v_status
    from finance_settlement_run
    where finance_settlement_run_pk = new.finance_settlement_run_fk;
  else
    select settlement_status_code into v_status
    from finance_settlement_run
    where finance_settlement_run_pk = old.finance_settlement_run_fk;
  end if;

  if v_status not in ('DRAFT','OPEN') then
    raise exception 'settlement entry mutation not allowed after lock';
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_finance_settlement_run_locked_guard on finance_settlement_run;
create trigger trg_finance_settlement_run_locked_guard
  before update on finance_settlement_run
  for each row execute function public.api_finance_assert_mutable_run();

drop trigger if exists trg_finance_entry_locked_guard on finance_restaurant_payout_entry;
create trigger trg_finance_entry_locked_guard
  before insert or update or delete on finance_restaurant_payout_entry
  for each row execute function public.api_finance_assert_mutable_run();

create or replace function public.api_preview_restaurant_settlement(
  p_restaurant_pk uuid,
  p_period_start_at timestamptz,
  p_period_end_at timestamptz,
  p_actor_profile_pk uuid default null
)
returns table (
  order_pk uuid,
  order_number text,
  pickup_window_end_at timestamptz,
  order_status_code text,
  payment_status_code text,
  paid_amount_paise bigint,
  payment_fee_paise bigint,
  payment_tax_paise bigint,
  refund_paise bigint,
  commission_bps integer,
  commission_plan_code text,
  commission_paise bigint,
  net_payout_paise bigint,
  eligibility_status_code text,
  exclusion_reason_code text,
  exclusion_reason_text text
)
language sql
security definer
set search_path = public
as $$
  with default_plan as (
    select plan_code, commission_bps, platform_fee_paise
    from restaurant_commission_plan
    where is_active
    order by is_default desc, case when plan_code = 'PILOT_0PCT_30D' then 0 else 1 end, created_at asc
    limit 1
  ),
  candidate as (
    select
      o.order_order_pk,
      o.order_number,
      o.pickup_window_end_at,
      o.order_status_code,
      o.payment_status_code,
      o.total_paise::bigint as paid_amount_paise,
      coalesce(t.fee_paise, 0)::bigint as payment_fee_paise,
      coalesce(t.tax_paise, 0)::bigint as payment_tax_paise,
      coalesce(refunds.refund_paise, 0)::bigint as refund_paise,
      coalesce(override_plan.plan_code, direct_plan.plan_code, default_plan.plan_code) as commission_plan_code,
      coalesce(ov.override_commission_bps, override_plan.commission_bps, direct_plan.commission_bps, default_plan.commission_bps, 0)::integer as commission_bps,
      coalesce(ov.override_platform_fee_paise, override_plan.platform_fee_paise, direct_plan.platform_fee_paise, default_plan.platform_fee_paise, 0)::bigint as platform_fee_paise,
      exists (
        select 1
        from finance_restaurant_payout_entry e
        join finance_settlement_run sr on sr.finance_settlement_run_pk = e.finance_settlement_run_fk
        where e.order_fk = o.order_order_pk
          and e.entry_type_code = 'ORDER_GROSS'
          and sr.settlement_status_code <> 'CANCELLED'
      ) as already_settled
    from order_order o
    left join payment_order_intent i on i.order_fk = o.order_order_pk
    left join lateral (
      select
        sum(coalesce(pt.fee_paise, 0))::bigint as fee_paise,
        sum(coalesce(pt.tax_paise, 0))::bigint as tax_paise
      from payment_transaction pt
      where pt.payment_order_intent_fk = i.payment_order_intent_pk
        and pt.transaction_status_code = 'CAPTURED'
    ) t on true
    left join lateral (
      select sum(pr.amount_paise)::bigint as refund_paise
      from payment_refund pr
      where pr.order_fk = o.order_order_pk
        and pr.refund_status_code in ('SUCCEEDED','PROCESSING')
    ) refunds on true
    left join lateral (
      select *
      from restaurant_commission_override ro
      where ro.restaurant_fk = o.restaurant_fk
        and ro.effective_from_at <= o.created_at
        and (ro.effective_until_at is null or ro.effective_until_at > o.created_at)
      order by ro.effective_from_at desc
      limit 1
    ) ov on true
    left join restaurant_commission_plan direct_plan on direct_plan.restaurant_commission_plan_pk = ov.restaurant_commission_plan_fk
    left join restaurant_commission_plan override_plan on override_plan.restaurant_commission_plan_pk = ov.restaurant_commission_plan_fk
    cross join default_plan
    where o.restaurant_fk = p_restaurant_pk
      and o.pickup_window_end_at >= p_period_start_at
      and o.pickup_window_end_at < p_period_end_at
  ),
  calculated as (
    select
      c.*,
      public.api_finance_money_round_bps(c.paid_amount_paise, c.commission_bps) + coalesce(c.platform_fee_paise, 0) as commission_paise
    from candidate c
  )
  select
    c.order_order_pk,
    c.order_number,
    c.pickup_window_end_at,
    c.order_status_code,
    c.payment_status_code,
    c.paid_amount_paise,
    c.payment_fee_paise,
    c.payment_tax_paise,
    c.refund_paise,
    c.commission_bps,
    c.commission_plan_code,
    c.commission_paise,
    greatest(c.paid_amount_paise - c.refund_paise - c.commission_paise - c.payment_fee_paise - c.payment_tax_paise, 0)::bigint as net_payout_paise,
    case
      when p_actor_profile_pk is not null and not public.api_finance_has_platform_access(p_actor_profile_pk) then 'EXCLUDED'
      when c.payment_status_code <> 'CAPTURED' then 'EXCLUDED'
      when c.order_status_code not in ('COLLECTED','NO_SHOW') then 'EXCLUDED'
      when c.pickup_window_end_at > now() then 'EXCLUDED'
      when c.already_settled then 'EXCLUDED'
      else 'ELIGIBLE'
    end as eligibility_status_code,
    case
      when p_actor_profile_pk is not null and not public.api_finance_has_platform_access(p_actor_profile_pk) then 'ADMIN_ACCESS_REQUIRED'
      when c.payment_status_code <> 'CAPTURED' then 'NOT_CAPTURED'
      when c.order_status_code not in ('COLLECTED','NO_SHOW') then 'NOT_PAYOUT_ELIGIBLE'
      when c.pickup_window_end_at > now() then 'PICKUP_WINDOW_OPEN'
      when c.already_settled then 'ALREADY_SETTLED'
      else null
    end as exclusion_reason_code,
    case
      when p_actor_profile_pk is not null and not public.api_finance_has_platform_access(p_actor_profile_pk) then 'Platform admin access is required.'
      when c.payment_status_code <> 'CAPTURED' then 'Payment is not webhook-confirmed captured.'
      when c.order_status_code not in ('COLLECTED','NO_SHOW') then 'Order is not collected or no-show.'
      when c.pickup_window_end_at > now() then 'Pickup window has not closed.'
      when c.already_settled then 'Order already belongs to an active settlement.'
      else null
    end as exclusion_reason_text
  from calculated c
  order by c.pickup_window_end_at asc, c.order_number asc
$$;

create or replace function public.api_create_or_recalculate_settlement_run(
  p_restaurant_pk uuid,
  p_period_start_at timestamptz,
  p_period_end_at timestamptz,
  p_actor_profile_pk uuid,
  p_note_text text default null
)
returns table (
  settlement_run_pk uuid,
  settlement_status_code text,
  order_count integer,
  gross_sales_paise bigint,
  refund_paise bigint,
  commission_paise bigint,
  payment_fee_paise bigint,
  tax_paise bigint,
  adjustment_paise bigint,
  net_payout_paise bigint,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run finance_settlement_run%rowtype;
  v_preview record;
  v_eligible_count integer := 0;
  v_excluded_count integer := 0;
  v_existing_adjustment_total bigint := 0;
  v_metadata jsonb;
begin
  if not public.api_finance_is_admin(p_actor_profile_pk) then
    raise exception 'finance admin access required';
  end if;
  if p_period_start_at is null or p_period_end_at is null or p_period_end_at <= p_period_start_at then
    raise exception 'invalid period';
  end if;
  if p_period_end_at > now() then
    raise exception 'period must end before now';
  end if;
  if not exists (select 1 from restaurant_restaurant where restaurant_restaurant_pk = p_restaurant_pk) then
    raise exception 'restaurant not found';
  end if;

  select * into v_run
  from finance_settlement_run
  where restaurant_fk = p_restaurant_pk
    and period_start_at = p_period_start_at
    and period_end_at = p_period_end_at
    and settlement_status_code <> 'CANCELLED'
  for update;

  if found and v_run.settlement_status_code not in ('DRAFT','OPEN') then
    raise exception 'recalculation not allowed';
  end if;

  if not found then
    insert into finance_settlement_run (
      restaurant_fk,
      period_start_at,
      period_end_at,
      settlement_status_code,
      calculation_metadata_json,
      status_note_text
    ) values (
      p_restaurant_pk,
      p_period_start_at,
      p_period_end_at,
      'DRAFT',
      jsonb_build_object('created_by_profile_fk', p_actor_profile_pk, 'manual_payout_only', true),
      nullif(trim(coalesce(p_note_text, '')), '')
    )
    returning * into v_run;
  end if;

  delete from finance_restaurant_payout_entry
  where finance_settlement_run_fk = v_run.finance_settlement_run_pk
    and is_system_generated = true;

  select coalesce(sum(amount_paise), 0) into v_existing_adjustment_total
  from finance_restaurant_payout_entry
  where finance_settlement_run_fk = v_run.finance_settlement_run_pk
    and entry_type_code = 'ADJUSTMENT';

  for v_preview in
    select *
    from public.api_preview_restaurant_settlement(p_restaurant_pk, p_period_start_at, p_period_end_at, p_actor_profile_pk)
  loop
    if v_preview.eligibility_status_code = 'ELIGIBLE' then
      v_eligible_count := v_eligible_count + 1;
      v_metadata := jsonb_build_object(
        'commission_bps', v_preview.commission_bps,
        'commission_plan_code', v_preview.commission_plan_code,
        'pilot_estimate', true,
        'manual_payout_only', true
      );

      insert into finance_restaurant_payout_entry (
        finance_settlement_run_fk, restaurant_fk, order_fk, order_number, payment_transaction_fk,
        entry_type_code, amount_paise, line_key, description_text, commission_bps, commission_plan_code,
        source_status_code, calculation_metadata_json, created_by_profile_fk, is_system_generated
      )
      select
        v_run.finance_settlement_run_pk,
        p_restaurant_pk,
        v_preview.order_pk,
        v_preview.order_number,
        pt.payment_transaction_pk,
        'ORDER_GROSS',
        v_preview.paid_amount_paise,
        concat('order:', v_preview.order_pk, ':gross'),
        concat('Gross sale for ', v_preview.order_number),
        v_preview.commission_bps,
        v_preview.commission_plan_code,
        v_preview.order_status_code,
        v_metadata,
        p_actor_profile_pk,
        true
      from payment_order_intent i
      left join payment_transaction pt
        on pt.payment_order_intent_fk = i.payment_order_intent_pk
        and pt.transaction_status_code = 'CAPTURED'
      where i.order_fk = v_preview.order_pk
      order by pt.captured_at desc nulls last
      limit 1;

      if v_preview.commission_paise > 0 then
        insert into finance_restaurant_payout_entry (
          finance_settlement_run_fk, restaurant_fk, order_fk, order_number,
          entry_type_code, amount_paise, line_key, description_text, commission_bps, commission_plan_code,
          source_status_code, calculation_metadata_json, created_by_profile_fk, is_system_generated
        ) values (
          v_run.finance_settlement_run_pk, p_restaurant_pk, v_preview.order_pk, v_preview.order_number,
          'COMMISSION', -v_preview.commission_paise, concat('order:', v_preview.order_pk, ':commission'),
          concat('Commission estimate for ', v_preview.order_number),
          v_preview.commission_bps, v_preview.commission_plan_code, v_preview.order_status_code,
          v_metadata, p_actor_profile_pk, true
        );
      end if;

      if v_preview.payment_fee_paise > 0 then
        insert into finance_restaurant_payout_entry (
          finance_settlement_run_fk, restaurant_fk, order_fk, order_number,
          entry_type_code, amount_paise, line_key, description_text, source_status_code,
          calculation_metadata_json, created_by_profile_fk, is_system_generated
        ) values (
          v_run.finance_settlement_run_pk, p_restaurant_pk, v_preview.order_pk, v_preview.order_number,
          'PAYMENT_FEE', -v_preview.payment_fee_paise, concat('order:', v_preview.order_pk, ':payment-fee'),
          concat('Razorpay fee deduction for ', v_preview.order_number), v_preview.order_status_code,
          v_metadata, p_actor_profile_pk, true
        );
      end if;

      if v_preview.payment_tax_paise > 0 then
        insert into finance_restaurant_payout_entry (
          finance_settlement_run_fk, restaurant_fk, order_fk, order_number,
          entry_type_code, amount_paise, line_key, description_text, source_status_code,
          calculation_metadata_json, created_by_profile_fk, is_system_generated
        ) values (
          v_run.finance_settlement_run_pk, p_restaurant_pk, v_preview.order_pk, v_preview.order_number,
          'TAX', -v_preview.payment_tax_paise, concat('order:', v_preview.order_pk, ':payment-tax'),
          concat('Payment tax deduction for ', v_preview.order_number), v_preview.order_status_code,
          v_metadata, p_actor_profile_pk, true
        );
      end if;

      insert into finance_restaurant_payout_entry (
        finance_settlement_run_fk, restaurant_fk, order_fk, payment_refund_fk, order_number,
        entry_type_code, amount_paise, line_key, description_text, source_status_code,
        calculation_metadata_json, created_by_profile_fk, is_system_generated
      )
      select
        v_run.finance_settlement_run_pk,
        p_restaurant_pk,
        v_preview.order_pk,
        pr.payment_refund_pk,
        v_preview.order_number,
        'REFUND',
        -pr.amount_paise,
        concat('refund:', pr.payment_refund_pk),
        concat('Refund/debit visibility: ', pr.refund_reason_code),
        pr.refund_status_code,
        v_metadata || jsonb_build_object('refund_status_code', pr.refund_status_code),
        p_actor_profile_pk,
        true
      from payment_refund pr
      where pr.order_fk = v_preview.order_pk
        and pr.refund_status_code in ('SUCCEEDED','PROCESSING');
    else
      v_excluded_count := v_excluded_count + 1;
    end if;
  end loop;

  if v_eligible_count = 0 and v_existing_adjustment_total = 0 then
    raise exception 'no eligible orders';
  end if;

  perform public.api_finance_recalculate_run_totals(v_run.finance_settlement_run_pk);

  update finance_settlement_run
  set excluded_order_count = v_excluded_count,
      calculation_metadata_json = calculation_metadata_json || jsonb_build_object(
        'last_recalculated_by_profile_fk', p_actor_profile_pk,
        'last_recalculated_at', now(),
        'manual_payout_only', true,
        'tax_assumption', 'Payment provider fee tax only; GST/legal invoice wording requires human review before lock.'
      ),
      status_note_text = coalesce(nullif(trim(coalesce(p_note_text, '')), ''), status_note_text),
      updated_at = now()
  where finance_settlement_run_pk = v_run.finance_settlement_run_pk
  returning * into v_run;

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'FINANCE_ADMIN',
    'SETTLEMENT_RECALCULATED',
    'FINANCE_SETTLEMENT_RUN',
    v_run.finance_settlement_run_pk,
    jsonb_build_object('restaurant_fk', p_restaurant_pk, 'period_start_at', p_period_start_at, 'period_end_at', p_period_end_at, 'order_count', v_run.order_count)
  );

  return query
  select
    v_run.finance_settlement_run_pk,
    v_run.settlement_status_code,
    v_run.order_count,
    v_run.gross_sales_paise,
    v_run.refund_paise,
    v_run.commission_paise,
    v_run.payment_fee_paise,
    v_run.tax_paise,
    v_run.adjustment_paise,
    v_run.net_payout_paise,
    'Draft settlement calculated. Manual finance review is required before lock.'::text;
end;
$$;

create or replace function public.api_create_settlement_adjustment(
  p_settlement_run_pk uuid,
  p_actor_profile_pk uuid,
  p_amount_paise bigint,
  p_description_text text
)
returns table (
  payout_entry_pk uuid,
  settlement_run_pk uuid,
  amount_paise bigint,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run finance_settlement_run%rowtype;
  v_entry_pk uuid;
begin
  if not public.api_finance_is_admin(p_actor_profile_pk) then
    raise exception 'finance admin access required';
  end if;
  if coalesce(p_amount_paise, 0) = 0 then
    raise exception 'adjustment amount required';
  end if;
  if length(trim(coalesce(p_description_text, ''))) < 8 then
    raise exception 'adjustment note required';
  end if;

  select * into v_run
  from finance_settlement_run
  where finance_settlement_run_pk = p_settlement_run_pk
  for update;

  if not found then
    raise exception 'settlement not found';
  end if;
  if v_run.settlement_status_code not in ('DRAFT','OPEN') then
    raise exception 'adjustment not allowed after lock';
  end if;

  insert into finance_restaurant_payout_entry (
    finance_settlement_run_fk,
    restaurant_fk,
    entry_type_code,
    amount_paise,
    line_key,
    description_text,
    calculation_metadata_json,
    created_by_profile_fk,
    is_system_generated
  ) values (
    v_run.finance_settlement_run_pk,
    v_run.restaurant_fk,
    'ADJUSTMENT',
    p_amount_paise,
    concat('adjustment:', gen_random_uuid()),
    left(trim(p_description_text), 1000),
    jsonb_build_object('manual_adjustment', true, 'manual_payout_only', true),
    p_actor_profile_pk,
    false
  )
  returning finance_restaurant_payout_entry_pk into v_entry_pk;

  perform public.api_finance_recalculate_run_totals(v_run.finance_settlement_run_pk);

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'FINANCE_ADMIN',
    'SETTLEMENT_ADJUSTMENT_CREATED',
    'FINANCE_RESTAURANT_PAYOUT_ENTRY',
    v_entry_pk,
    jsonb_build_object('settlement_run_fk', v_run.finance_settlement_run_pk, 'amount_paise', p_amount_paise, 'note', left(trim(p_description_text), 500))
  );

  return query select v_entry_pk, v_run.finance_settlement_run_pk, p_amount_paise, 'Manual adjustment added to draft settlement.'::text;
end;
$$;

create or replace function public.api_lock_settlement_run(
  p_settlement_run_pk uuid,
  p_actor_profile_pk uuid,
  p_reason_text text
)
returns table (
  settlement_run_pk uuid,
  settlement_status_code text,
  locked_at timestamptz,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run finance_settlement_run%rowtype;
  v_totals record;
begin
  if not public.api_finance_is_admin(p_actor_profile_pk) then
    raise exception 'finance admin access required';
  end if;
  if length(trim(coalesce(p_reason_text, ''))) < 8 then
    raise exception 'lock reason required';
  end if;

  select * into v_run
  from finance_settlement_run
  where finance_settlement_run_pk = p_settlement_run_pk
  for update;

  if not found then
    raise exception 'settlement not found';
  end if;
  if v_run.settlement_status_code not in ('DRAFT','OPEN') then
    raise exception 'lock not allowed';
  end if;
  if v_run.order_count <= 0 then
    raise exception 'no eligible orders';
  end if;

  select
    coalesce(sum(amount_paise) filter (where entry_type_code = 'ORDER_GROSS'), 0) as gross_sales_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'REFUND'), 0)) as refund_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'COMMISSION'), 0)) as commission_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'PAYMENT_FEE'), 0)) as payment_fee_paise,
    abs(coalesce(sum(amount_paise) filter (where entry_type_code = 'TAX'), 0)) as tax_paise,
    coalesce(sum(amount_paise) filter (where entry_type_code = 'ADJUSTMENT'), 0) as adjustment_paise,
    greatest(coalesce(sum(amount_paise), 0), 0) as net_payout_paise,
    count(distinct order_fk) filter (where order_fk is not null and entry_type_code = 'ORDER_GROSS') as order_count
  into v_totals
  from finance_restaurant_payout_entry
  where finance_settlement_run_fk = v_run.finance_settlement_run_pk;

  if v_totals.gross_sales_paise <> v_run.gross_sales_paise
     or v_totals.refund_paise <> v_run.refund_paise
     or v_totals.commission_paise <> v_run.commission_paise
     or v_totals.payment_fee_paise <> v_run.payment_fee_paise
     or v_totals.tax_paise <> v_run.tax_paise
     or v_totals.adjustment_paise <> v_run.adjustment_paise
     or v_totals.net_payout_paise <> v_run.net_payout_paise
     or v_totals.order_count <> v_run.order_count then
    raise exception 'settlement totals changed; recalculate before lock';
  end if;

  update finance_settlement_run
  set settlement_status_code = 'LOCKED',
      locked_by_profile_fk = p_actor_profile_pk,
      locked_at = now(),
      lock_reason_text = left(trim(p_reason_text), 1000),
      calculation_metadata_json = calculation_metadata_json || jsonb_build_object('locked_manual_review_required', true, 'manual_payout_only', true),
      updated_at = now()
  where finance_settlement_run_pk = v_run.finance_settlement_run_pk
  returning * into v_run;

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'FINANCE_ADMIN',
    'SETTLEMENT_LOCKED',
    'FINANCE_SETTLEMENT_RUN',
    v_run.finance_settlement_run_pk,
    jsonb_build_object('reason', left(trim(p_reason_text), 500), 'net_payout_paise', v_run.net_payout_paise, 'manual_payout_only', true)
  );

  return query select v_run.finance_settlement_run_pk, v_run.settlement_status_code, v_run.locked_at, 'Settlement locked. Entries are now read-only; payouts remain manual.'::text;
end;
$$;

create or replace function public.api_mark_settlement_status(
  p_settlement_run_pk uuid,
  p_actor_profile_pk uuid,
  p_next_status_code text,
  p_note_text text,
  p_provider_reference_text text default null
)
returns table (
  settlement_run_pk uuid,
  settlement_status_code text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run finance_settlement_run%rowtype;
  v_allowed boolean := false;
begin
  if not public.api_finance_is_admin(p_actor_profile_pk) then
    raise exception 'finance admin access required';
  end if;
  if length(trim(coalesce(p_note_text, ''))) < 8 then
    raise exception 'status note required';
  end if;

  select * into v_run
  from finance_settlement_run
  where finance_settlement_run_pk = p_settlement_run_pk
  for update;

  if not found then
    raise exception 'settlement not found';
  end if;

  v_allowed := (v_run.settlement_status_code = 'LOCKED' and p_next_status_code in ('SENT','CANCELLED'))
    or (v_run.settlement_status_code = 'SENT' and p_next_status_code in ('PAID','CANCELLED'))
    or (v_run.settlement_status_code = 'PAID' and p_next_status_code = 'RECONCILED')
    or (v_run.settlement_status_code in ('DRAFT','OPEN') and p_next_status_code = 'CANCELLED');

  if not v_allowed then
    raise exception 'status transition not allowed';
  end if;

  update finance_settlement_run
  set settlement_status_code = p_next_status_code,
      status_note_text = left(trim(p_note_text), 1000),
      payout_provider_reference_text = coalesce(nullif(trim(coalesce(p_provider_reference_text, '')), ''), payout_provider_reference_text),
      paid_at = case when p_next_status_code = 'PAID' then now() else paid_at end,
      reconciled_at = case when p_next_status_code = 'RECONCILED' then now() else reconciled_at end,
      cancelled_at = case when p_next_status_code = 'CANCELLED' then now() else cancelled_at end,
      cancelled_by_profile_fk = case when p_next_status_code = 'CANCELLED' then p_actor_profile_pk else cancelled_by_profile_fk end,
      cancelled_reason_text = case when p_next_status_code = 'CANCELLED' then left(trim(p_note_text), 1000) else cancelled_reason_text end,
      updated_at = now()
  where finance_settlement_run_pk = v_run.finance_settlement_run_pk
  returning * into v_run;

  update finance_invoice
  set invoice_status_code = case
      when p_next_status_code = 'PAID' and invoice_status_code = 'ISSUED' then 'PAID'
      when p_next_status_code = 'CANCELLED' and invoice_status_code in ('DRAFT','ISSUED') then 'VOID'
      else invoice_status_code
    end,
    paid_at = case when p_next_status_code = 'PAID' then coalesce(paid_at, now()) else paid_at end,
    updated_at = now()
  where finance_settlement_run_fk = v_run.finance_settlement_run_pk;

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'FINANCE_ADMIN',
    concat('SETTLEMENT_', p_next_status_code),
    'FINANCE_SETTLEMENT_RUN',
    v_run.finance_settlement_run_pk,
    jsonb_build_object('note', left(trim(p_note_text), 500), 'provider_reference_present', p_provider_reference_text is not null, 'manual_payout_only', true)
  );

  return query select v_run.finance_settlement_run_pk, v_run.settlement_status_code, concat('Settlement marked ', lower(p_next_status_code), '. No live payout was initiated.')::text;
end;
$$;

create or replace function public.api_issue_settlement_invoice(
  p_settlement_run_pk uuid,
  p_actor_profile_pk uuid,
  p_invoice_number text,
  p_metadata_json jsonb default '{}'::jsonb,
  p_external_document_ref text default null
)
returns table (
  invoice_pk uuid,
  settlement_run_pk uuid,
  invoice_number text,
  invoice_status_code text,
  invoice_amount_paise bigint,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run finance_settlement_run%rowtype;
  v_invoice finance_invoice%rowtype;
  v_number text;
begin
  if not public.api_finance_is_admin(p_actor_profile_pk) then
    raise exception 'finance admin access required';
  end if;

  v_number := upper(trim(coalesce(p_invoice_number, '')));
  if length(v_number) < 4 then
    raise exception 'invoice number required';
  end if;

  select * into v_run
  from finance_settlement_run
  where finance_settlement_run_pk = p_settlement_run_pk
  for update;

  if not found then
    raise exception 'settlement not found';
  end if;
  if v_run.settlement_status_code not in ('LOCKED','SENT','PAID','RECONCILED') then
    raise exception 'invoice not available until settlement is locked';
  end if;

  insert into finance_invoice (
    finance_settlement_run_fk,
    restaurant_fk,
    invoice_number,
    invoice_status_code,
    invoice_amount_paise,
    issued_at,
    issued_by_profile_fk,
    invoice_metadata_json,
    external_document_ref,
    download_safe_filename
  ) values (
    v_run.finance_settlement_run_pk,
    v_run.restaurant_fk,
    v_number,
    'ISSUED',
    v_run.net_payout_paise,
    now(),
    p_actor_profile_pk,
    coalesce(p_metadata_json, '{}'::jsonb) || jsonb_build_object('manual_metadata_only', true, 'legal_tax_review_required', true),
    nullif(trim(coalesce(p_external_document_ref, '')), ''),
    concat(regexp_replace(lower(v_number), '[^a-z0-9_-]+', '-', 'g'), '.pdf')
  )
  on conflict (finance_settlement_run_fk) do update
    set invoice_number = excluded.invoice_number,
        invoice_status_code = 'ISSUED',
        invoice_amount_paise = excluded.invoice_amount_paise,
        issued_at = coalesce(finance_invoice.issued_at, excluded.issued_at),
        issued_by_profile_fk = excluded.issued_by_profile_fk,
        invoice_metadata_json = finance_invoice.invoice_metadata_json || excluded.invoice_metadata_json,
        external_document_ref = excluded.external_document_ref,
        download_safe_filename = excluded.download_safe_filename,
        updated_at = now()
  returning * into v_invoice;

  insert into audit_log (actor_profile_fk, actor_role_code, action_code, target_entity_type_code, target_entity_pk, audit_payload_json)
  values (
    p_actor_profile_pk,
    'FINANCE_ADMIN',
    'SETTLEMENT_INVOICE_ISSUED',
    'FINANCE_INVOICE',
    v_invoice.finance_invoice_pk,
    jsonb_build_object('settlement_run_fk', v_run.finance_settlement_run_pk, 'invoice_number', v_invoice.invoice_number, 'manual_metadata_only', true)
  );

  return query
  select
    v_invoice.finance_invoice_pk,
    v_run.finance_settlement_run_pk,
    v_invoice.invoice_number,
    v_invoice.invoice_status_code,
    v_invoice.invoice_amount_paise,
    'Invoice metadata issued. Attach/download files only through authorized signed URLs when a document is added.'::text;
end;
$$;

drop view if exists api_admin_finance_eligible_order_summary;
drop view if exists api_admin_finance_settlement_detail;
drop view if exists api_restaurant_finance_settlement_detail;
drop view if exists api_admin_finance_settlement_summary;
drop view if exists api_restaurant_finance_settlement_summary;

create view api_restaurant_finance_settlement_summary
with (security_barrier = true) as
select
  sr.finance_settlement_run_pk as settlement_run_pk,
  sr.restaurant_fk,
  r.restaurant_name,
  sr.period_start_at,
  sr.period_end_at,
  sr.settlement_status_code,
  sr.order_count,
  sr.excluded_order_count,
  sr.gross_sales_paise,
  sr.refund_paise,
  sr.commission_paise,
  sr.payment_fee_paise,
  sr.tax_paise,
  sr.adjustment_paise,
  sr.net_payout_paise,
  sr.locked_at,
  sr.paid_at,
  sr.reconciled_at,
  sr.cancelled_at,
  sr.status_note_text,
  sr.payout_provider_reference_text,
  pa.payout_account_status_code,
  public.api_finance_payout_account_mask(pa.masked_account_number, pa.payout_account_status_code) as masked_payout_account,
  inv.finance_invoice_pk as invoice_pk,
  inv.invoice_number,
  inv.invoice_status_code,
  inv.invoice_amount_paise,
  inv.issued_at as invoice_issued_at,
  inv.download_safe_filename,
  sr.created_at,
  sr.updated_at
from finance_settlement_run sr
join restaurant_restaurant r on r.restaurant_restaurant_pk = sr.restaurant_fk
left join restaurant_payout_account pa on pa.restaurant_fk = sr.restaurant_fk
left join finance_invoice inv on inv.finance_settlement_run_fk = sr.finance_settlement_run_pk
where public.rls_has_restaurant_access(sr.restaurant_fk);

create view api_admin_finance_settlement_summary
with (security_barrier = true) as
select
  sr.finance_settlement_run_pk as settlement_run_pk,
  sr.restaurant_fk,
  r.restaurant_name,
  sr.period_start_at,
  sr.period_end_at,
  sr.settlement_status_code,
  sr.order_count,
  sr.excluded_order_count,
  sr.gross_sales_paise,
  sr.refund_paise,
  sr.commission_paise,
  sr.payment_fee_paise,
  sr.tax_paise,
  sr.adjustment_paise,
  sr.net_payout_paise,
  sr.locked_at,
  sr.paid_at,
  sr.reconciled_at,
  sr.cancelled_at,
  sr.lock_reason_text,
  sr.status_note_text,
  sr.payout_provider_reference_text,
  pa.payout_account_status_code,
  public.api_finance_payout_account_mask(pa.masked_account_number, pa.payout_account_status_code) as masked_payout_account,
  inv.finance_invoice_pk as invoice_pk,
  inv.invoice_number,
  inv.invoice_status_code,
  inv.invoice_amount_paise,
  inv.issued_at as invoice_issued_at,
  inv.external_document_ref,
  inv.download_safe_filename,
  sr.created_at,
  sr.updated_at
from finance_settlement_run sr
join restaurant_restaurant r on r.restaurant_restaurant_pk = sr.restaurant_fk
left join restaurant_payout_account pa on pa.restaurant_fk = sr.restaurant_fk
left join finance_invoice inv on inv.finance_settlement_run_fk = sr.finance_settlement_run_pk
where public.rls_is_platform_user();

create view api_restaurant_finance_settlement_detail
with (security_barrier = true) as
select
  e.finance_restaurant_payout_entry_pk as payout_entry_pk,
  e.finance_settlement_run_fk as settlement_run_pk,
  e.restaurant_fk,
  e.order_fk,
  e.order_number,
  e.payment_refund_fk,
  e.entry_type_code,
  e.amount_paise,
  e.description_text,
  e.commission_bps,
  e.commission_plan_code,
  e.source_status_code,
  o.pickup_window_end_at,
  o.snapshot_bag_display_name as bag_display_name,
  o.total_paise as order_total_paise,
  e.created_at
from finance_restaurant_payout_entry e
join finance_settlement_run sr on sr.finance_settlement_run_pk = e.finance_settlement_run_fk
left join order_order o on o.order_order_pk = e.order_fk
where public.rls_has_restaurant_access(e.restaurant_fk);

create view api_admin_finance_settlement_detail
with (security_barrier = true) as
select
  e.finance_restaurant_payout_entry_pk as payout_entry_pk,
  e.finance_settlement_run_fk as settlement_run_pk,
  e.restaurant_fk,
  e.order_fk,
  e.order_number,
  e.payment_refund_fk,
  e.entry_type_code,
  e.amount_paise,
  e.description_text,
  e.commission_bps,
  e.commission_plan_code,
  e.source_status_code,
  o.pickup_window_end_at,
  o.snapshot_bag_display_name as bag_display_name,
  o.total_paise as order_total_paise,
  e.created_at,
  e.line_key,
  e.calculation_metadata_json,
  e.is_system_generated,
  e.created_by_profile_fk
from finance_restaurant_payout_entry e
left join order_order o on o.order_order_pk = e.order_fk
where public.rls_is_platform_user();

create view api_admin_finance_eligible_order_summary
with (security_barrier = true) as
select
  o.order_order_pk as order_pk,
  o.order_number,
  o.restaurant_fk,
  r.restaurant_name,
  o.order_status_code,
  o.payment_status_code,
  o.total_paise as paid_amount_paise,
  o.pickup_window_end_at,
  case
    when o.payment_status_code <> 'CAPTURED' then 'NOT_CAPTURED'
    when o.pickup_window_end_at > now() then 'PICKUP_WINDOW_OPEN'
    when o.order_status_code not in ('COLLECTED','NO_SHOW') then 'NOT_PAYOUT_ELIGIBLE'
    when exists (
      select 1 from finance_restaurant_payout_entry e
      join finance_settlement_run sr on sr.finance_settlement_run_pk = e.finance_settlement_run_fk
      where e.order_fk = o.order_order_pk
        and e.entry_type_code = 'ORDER_GROSS'
        and sr.settlement_status_code <> 'CANCELLED'
    ) then 'ALREADY_SETTLED'
    else 'ELIGIBLE'
  end as eligibility_status_code
from order_order o
join restaurant_restaurant r on r.restaurant_restaurant_pk = o.restaurant_fk
where public.rls_is_platform_user();

comment on view api_restaurant_finance_settlement_summary is
  'Restaurant-safe settlement summary scoped by active restaurant membership. Shows masked payout account, invoice metadata, payout status, and paise totals only.';
comment on view api_admin_finance_settlement_summary is
  'Admin-safe finance settlement summary. Does not expose full bank account numbers, private documents, raw Razorpay payloads, or consumer PII.';
comment on view api_restaurant_finance_settlement_detail is
  'Restaurant-safe settlement line detail scoped to own restaurant. Shows order numbers and accounting entries, not consumer contact data or provider payloads.';
comment on view api_admin_finance_eligible_order_summary is
  'Admin finance support scan for order settlement eligibility and exclusion reasons.';

grant select on api_restaurant_finance_settlement_summary to authenticated;
grant select on api_admin_finance_settlement_summary to authenticated;
grant select on api_restaurant_finance_settlement_detail to authenticated;
grant select on api_admin_finance_settlement_detail to authenticated;
grant select on api_admin_finance_eligible_order_summary to authenticated;

revoke all on function public.api_finance_is_admin(uuid) from public;
revoke all on function public.api_finance_has_platform_access(uuid) from public;
revoke all on function public.api_finance_money_round_bps(bigint, integer) from public;
revoke all on function public.api_finance_recalculate_run_totals(uuid) from public;
revoke all on function public.api_preview_restaurant_settlement(uuid, timestamptz, timestamptz, uuid) from public;
revoke all on function public.api_create_or_recalculate_settlement_run(uuid, timestamptz, timestamptz, uuid, text) from public;
revoke all on function public.api_create_settlement_adjustment(uuid, uuid, bigint, text) from public;
revoke all on function public.api_lock_settlement_run(uuid, uuid, text) from public;
revoke all on function public.api_mark_settlement_status(uuid, uuid, text, text, text) from public;
revoke all on function public.api_issue_settlement_invoice(uuid, uuid, text, jsonb, text) from public;

grant execute on function public.api_finance_payout_account_mask(text, text) to authenticated, service_role;
grant execute on function public.api_preview_restaurant_settlement(uuid, timestamptz, timestamptz, uuid) to service_role;
grant execute on function public.api_create_or_recalculate_settlement_run(uuid, timestamptz, timestamptz, uuid, text) to service_role;
grant execute on function public.api_create_settlement_adjustment(uuid, uuid, bigint, text) to service_role;
grant execute on function public.api_lock_settlement_run(uuid, uuid, text) to service_role;
grant execute on function public.api_mark_settlement_status(uuid, uuid, text, text, text) to service_role;
grant execute on function public.api_issue_settlement_invoice(uuid, uuid, text, jsonb, text) to service_role;

commit;
