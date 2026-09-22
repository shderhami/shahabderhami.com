import about from './data/about.json';

export const SITE = {
  title: 'Shahab Derhami',
  role: 'Assistant Professor of Business Analytics and Operations',
  affiliation: 'School of Management, Binghamton University',
  affiliationUrl: 'https://www.binghamton.edu/som/',
  url: 'https://www.shahabderhami.com',
  description:
    'Shahab Derhami is an Assistant Professor of Business Analytics and Operations at the ' +
    'School of Management, Binghamton University, working on business analytics for supply ' +
    'chain management, warehouse design and retail distribution networks.',
  /**
   * Social-card image. Kept at its own path (a copy made by the import
   * script) so that /wp-content/ URLs never need to appear as absolute links
   * in the built HTML.
   */
  image: '/og-card.jpg',
} as const;

export const NAV = [
  { href: '/blog/', label: 'Blog' },
  { href: '/publications/', label: 'Publications' },
  { href: '/about/', label: 'About' },
] as const;

export const PROFILES = [
  { href: about.cv?.url ?? '#', label: 'CV (PDF)', short: 'CV' },
  { href: about.scholar ?? '#', label: 'Google Scholar', short: 'Scholar' },
  { href: about.social?.linkedin ?? '#', label: 'LinkedIn', short: 'LinkedIn' },
  { href: about.social?.twitter ?? '#', label: 'Twitter / X', short: 'Twitter' },
].filter((p) => p.href !== '#');

/** Consistent, locale-stable date formatting across the site. */
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

export const formatDate = (d: Date) => dateFormatter.format(d);
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
