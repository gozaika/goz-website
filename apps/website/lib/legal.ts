/**
 * @file apps/website/lib/legal.ts
 * @description Legal page copy blocks aligned with execution briefing drafts.
 */

export const legalCopy = {
  privacyPolicy: [
    'GoZaika Technologies Pvt. Ltd. operates goZaika and processes data in line with the Digital Personal Data Protection Act, 2023.',
    'We collect only data required to operate waitlist, contact, and partner workflows: name, email, mobile (where applicable), city, and submitted message fields.',
    'We do not sell personal data. You may request access, correction, or erasure by emailing privacy@gozaika.in.',
    'Waitlist and enquiry records are retained only for operational follow-up windows and legal obligations.',
    'For grievances, contact grievance@gozaika.in. Placeholder regulatory details are marked pending incorporation.',
  ],
  termsOfService: [
    'You must be 18 years or older to use the platform.',
    'goZaika is an intermediary discovery platform; partner restaurants prepare food and handle pickup service directly.',
    'BAM Bag contents are undisclosed by design, but allergen categories and pickup window details are shown before purchase.',
    'Usage of the platform implies acceptance of the Refund Policy and Food Safety Policy routes.',
    'Disputes are governed by the laws of India with jurisdiction in Hyderabad, Telangana.',
  ],
  refundPolicy: [
    'Orders are non-cancellable once placed because partner kitchens are notified immediately.',
    'Refunds are considered when the restaurant cannot fulfill during pickup window, is unavailable, or a duplicate technical charge occurs.',
    'To request a refund, email refund@gozaika.in within 24 hours with order details and incident context.',
    'Eligible refunds are processed to the original payment source within standard banking timelines.',
  ],
  foodSafetyPolicy: [
    'goZaika follows the Food Safety and Standards Act, 2006 and relevant e-commerce standards.',
    'Only FSSAI-licensed restaurants are onboarded as partners.',
    'Each listing discloses relevant allergen categories before checkout.',
    'The platform is pickup-only and does not manage delivery transport.',
    'Report concerns to safety@gozaika.in for review and incident workflow.',
  ],
  grievanceRedressal: [
    'A grievance workflow is maintained under applicable Indian intermediary and DPDP provisions.',
    'Email grievance@gozaika.in with subject "Grievance - [Your Name]".',
    'Acknowledgement is targeted within 48 hours and resolution within 30 days.',
    'Data-related grievance requests are prioritized under the DPDP response obligations.',
  ],
} as const;
