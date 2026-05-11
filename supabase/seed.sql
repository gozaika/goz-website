-- Development seed entrypoint.
-- The canonical schema migration already contains reference-data seeds where the DDL defines them.
-- Add local-only fixture data here during vertical slices, never production secrets or PII.

insert into privacy_consent_purpose
  (purpose_code, purpose_name, description, is_required_for_service, display_order)
values
  ('OPERATIONAL', 'Operational', 'Core service: account, orders, pickup coordination, safety and support.', true, 10),
  ('MARKETING', 'Marketing', 'Product updates, new drop announcements, campaigns and goZaika news.', false, 20),
  ('ANALYTICS', 'Analytics', 'Privacy-aware product analytics used to improve discovery, reliability and safety.', false, 30),
  ('REFERRAL_COMMS', 'Referral Communications', 'Messages about referral invitations, status and rewards.', false, 40),
  ('WHATSAPP_TRANSACTIONAL', 'WhatsApp Transactional', 'WhatsApp messages for OTP, order confirmation, pickup reminders and support.', false, 50),
  ('WHATSAPP_MARKETING', 'WhatsApp Marketing', 'Promotional WhatsApp messages for drops, Swaad Club and campaigns.', false, 60)
on conflict (purpose_code) do update
set purpose_name = excluded.purpose_name,
    description = excluded.description,
    is_required_for_service = excluded.is_required_for_service,
    display_order = excluded.display_order,
    updated_at = now();
