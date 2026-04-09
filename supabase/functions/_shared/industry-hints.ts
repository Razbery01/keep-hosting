/**
 * industry-hints.ts — Industry-contextual prompting data (GEN-06)
 *
 * Provides a typed map of copy hints, CTA examples, and section priorities
 * for SA SMME verticals. Injected into CODE_AGENT_SYSTEM via {industry_hints} slot.
 *
 * IMPORTANT: Do NOT hardcode SA-specific locations (Cape Town, Johannesburg, etc.).
 * City/province come from the onboarding form and are injected separately.
 *
 * Pure TypeScript: NO Deno imports — importable in Node Vitest AND Deno Edge Functions.
 */

export interface IndustryHint {
  copy_hints: string[]
  cta_examples: string[]
  section_priority: string[]
}

export type IndustryKey =
  | 'plumber'
  | 'electrician'
  | 'restaurant'
  | 'lawyer'
  | 'consultant'
  | 'trades-general'
  | 'beauty'
  | 'other'

export const INDUSTRY_HINTS: Record<IndustryKey, IndustryHint> = {
  plumber: {
    copy_hints: [
      '24/7 emergency callouts',
      'call-out fee transparency',
      'service areas in the city',
      'licensed and insured plumbers',
      'fast response time guaranteed',
    ],
    cta_examples: [
      'Call now for emergencies',
      'Get a free quote',
      'Book a same-day appointment',
    ],
    section_priority: [
      'hero with phone CTA',
      'emergency services',
      'service areas',
      'testimonials',
      'contact with phone number prominent',
    ],
  },

  electrician: {
    copy_hints: [
      'certified and COC-compliant electricians',
      'residential and commercial electrical work',
      'safety-first approach on every job',
      'prompt emergency fault finding',
      'transparent quoting before work begins',
    ],
    cta_examples: [
      'Request a free quote',
      'Book an emergency callout',
      'Call for electrical faults',
    ],
    section_priority: [
      'hero with emergency contact',
      'services and specialisations',
      'certifications and compliance',
      'service areas',
      'contact',
    ],
  },

  restaurant: {
    copy_hints: [
      'fresh ingredients sourced daily',
      'online reservations and table bookings',
      'menu highlights and seasonal specials',
      'private dining and events catering',
      'family-friendly atmosphere',
    ],
    cta_examples: [
      'Book a table online',
      'View our menu',
      'Order for delivery or takeaway',
    ],
    section_priority: [
      'hero with stunning food imagery',
      'featured menu items',
      'booking/reservation section',
      'location and hours',
      'testimonials and atmosphere',
    ],
  },

  lawyer: {
    copy_hints: [
      'free initial consultation available',
      'areas of legal practice clearly listed',
      'professional credentials and bar admission',
      'client confidentiality guaranteed',
      'results-driven legal representation',
    ],
    cta_examples: [
      'Book a free consultation',
      'Contact our legal team',
      'Get expert legal advice',
    ],
    section_priority: [
      'hero with trust signal and CTA',
      'practice areas',
      'attorney profiles and credentials',
      'client testimonials',
      'contact and office location',
    ],
  },

  consultant: {
    copy_hints: [
      'proven track record with measurable outcomes',
      'tailored solutions for your business challenges',
      'industry expertise across multiple sectors',
      'structured consulting process and methodology',
      'case studies and client success stories',
    ],
    cta_examples: [
      'Schedule a discovery call',
      'Request a proposal',
      'See our case studies',
    ],
    section_priority: [
      'hero with value proposition',
      'services and approach',
      'case studies and results',
      'about and credentials',
      'contact and inquiry form',
    ],
  },

  'trades-general': {
    copy_hints: [
      'skilled tradespeople with years of experience',
      'fully insured and safety-compliant',
      'competitive pricing with no hidden costs',
      'free site visits and assessments',
      'quality workmanship guaranteed',
    ],
    cta_examples: [
      'Get a free estimate',
      'Call for a site visit',
      'Request a quote today',
    ],
    section_priority: [
      'hero with CTA and phone number',
      'services offered',
      'why choose us',
      'recent projects or gallery',
      'contact and service area',
    ],
  },

  beauty: {
    copy_hints: [
      'professional treatments for hair, skin, and nails',
      'online booking for appointments',
      'before and after results showcased',
      'premium products used in all treatments',
      'relaxing and welcoming salon environment',
    ],
    cta_examples: [
      'Book your appointment online',
      'View our treatment menu',
      'Call to reserve your spot',
    ],
    section_priority: [
      'hero with salon ambiance imagery',
      'treatments and services menu',
      'before and after gallery',
      'booking section',
      'testimonials and team',
    ],
  },

  other: {
    copy_hints: [
      'clear value proposition for your customers',
      'professional credentials and trust signals',
      'easy contact and inquiry options',
      'showcase of services or products',
      'why customers choose this business',
    ],
    cta_examples: [
      'Get in touch',
      'Request a quote',
      'Learn more about our services',
    ],
    section_priority: [
      'hero with tagline',
      'services',
      'about',
      'testimonials',
      'contact',
    ],
  },
}

/**
 * Look up industry hints by key. Case-insensitive.
 * Falls back to 'other' neutral hints for unknown industries — never throws.
 */
export function getIndustryHints(industry: string): IndustryHint {
  const key = (industry ?? '').toLowerCase().trim() as IndustryKey
  return INDUSTRY_HINTS[key] ?? INDUSTRY_HINTS.other
}
