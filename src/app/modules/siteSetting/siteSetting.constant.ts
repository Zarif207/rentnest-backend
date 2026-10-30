export const HOMEPAGE_KEY = "homepage";

// Every homepage section the admin can order or hide.
export const HOMEPAGE_SECTIONS = [
  "statement",
  "stats",
  "featured",
  "states",
  "propertyTypes",
  "latest",
  "howItWorks",
  "whyUs",
  "reviews",
  "faq",
] as const;

// The order the homepage used before it was configurable.
export const DEFAULT_SECTION_ORDER = [...HOMEPAGE_SECTIONS];

export const HOMEPAGE_LIMITS = {
  hero: 3,
  featured: 12,
  states: 8,
  latestMin: 4,
  latestMax: 16,
  defaultFeatured: 8,
  defaultLatest: 8,
} as const;
