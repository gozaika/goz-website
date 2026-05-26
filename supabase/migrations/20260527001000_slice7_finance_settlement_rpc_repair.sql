-- Slice 7 repair: qualify settlement status inside the create/recalculate RPC.
-- The return column named settlement_status_code is also a PL/pgSQL variable,
-- so unqualified table references can fail with SQLSTATE 42702.

begin;

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
  from finance_settlement_run sr
  where sr.restaurant_fk = p_restaurant_pk
    and sr.period_start_at = p_period_start_at
    and sr.period_end_at = p_period_end_at
    and sr.settlement_status_code <> 'CANCELLED'
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

commit;
