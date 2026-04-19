/**
 * @file apps/website/lib/analytics.ts
 * @description Frozen GA4 event taxonomy helpers for website phase.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type CtaLocation =
  | 'hero'
  | 'nav'
  | 'section_restaurant_teaser'
  | 'section_waitlist'
  | 'page_bottom'
  | 'for_restaurants_page';

type ContactSubject =
  | 'general'
  | 'restaurant'
  | 'investor'
  | 'press'
  | 'careers';

type FaqCategory = 'consumer' | 'restaurant' | 'safety';

/**
 * Dispatches a GA4 event when analytics is available in the browser.
 *
 * @param name - GA4 event name.
 * @param params - Structured event parameters.
 * @returns Nothing.
 */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!window.gtag) {
    return;
  }

  window.gtag('event', name, params);
}

export const track = {
  ctaClick: (text: string, location: CtaLocation): void =>
    trackEvent('cta_click', { cta_text: text, cta_location: location }),
  waitlistStart: (): void => trackEvent('waitlist_form_start'),
  waitlistSubmit: (city: string, role: 'consumer' | 'restaurant'): void =>
    trackEvent('waitlist_form_submit', { city, role }),
  waitlistSuccess: (city: string, role: 'consumer' | 'restaurant'): void =>
    trackEvent('waitlist_form_success', { city, role }),
  waitlistError: (errorType: string): void =>
    trackEvent('waitlist_form_error', { error_type: errorType }),
  contactSubmit: (subject: ContactSubject): void =>
    trackEvent('contact_form_submit', { subject }),
  contactSuccess: (subject: ContactSubject): void =>
    trackEvent('contact_form_success', { subject }),
  partnerSubmit: (city: string, cuisine: string): void =>
    trackEvent('partner_interest_submit', { city, cuisine }),
  partnerSuccess: (city: string): void =>
    trackEvent('partner_interest_success', { city }),
  navClick: (item: string, location: 'header' | 'footer' | 'mobile_drawer'): void =>
    trackEvent('nav_click', { nav_item: item, nav_location: location }),
  faqExpand: (id: string, category: FaqCategory): void =>
    trackEvent('faq_expand', { faq_id: id, faq_category: category }),
};
