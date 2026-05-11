# Privacy and Erasure Runbook

## DPDP Consent

Consent is purpose-scoped and append-only through `privacy_consent_event`. Do not model consent as a single boolean. Optional consents default off; operational consent is captured at signup when required.

## Erasure Flow

1. Consumer initiates `privacy_erasure_request`.
2. Admin reviews legal and financial retention constraints.
3. Approved requests anonymize profile fields while retaining legally required financial/audit records.
4. All admin actions write audit records.

## HUMAN_REVIEW

Legal review is required before enabling production erasure automation. Confirm retention windows, financial record exemptions, support-ticket treatment, and notification suppression policy.

