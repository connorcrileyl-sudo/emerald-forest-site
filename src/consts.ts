/*
 * Every client-specific fact lives in this file. Nav, Footer, page titles
 * and contact sections all read from here, so a new client means editing
 * this file, not hunting through components.
 *
 * Leave a field as "" until the client confirms it. Empty fields are
 * hidden, never shown as placeholder text. Do not invent business facts.
 */

/** Site name. Appended to every page title and used as `og:site_name`. */
export const SITE_NAME = "Business Name";
/** Fallback meta description for pages that don't set their own. */
export const SITE_DESCRIPTION =
  "A short sentence about what the business does and who it serves.";
/** Canonical origin. Resolves canonical URLs, social images, and the sitemap. */
export const SITE_URL = "https://example.com";
/** BCP 47 locale tag used to format dates and numbers. */
export const SITE_LOCALE = "en-US";
/** Routes excluded from search and the sitemap. Surrounding slashes are ignored. */
export const NOINDEX_ROUTES: string[] = ["/404", "/sections"];

export type Link = {
  /** Visible link text. */
  label: string;
  /** Link destination. */
  href: string;
};

/** How to reach the business. Shown in the footer and contact sections. */
export const BUSINESS = {
  /** One line under the name, e.g. "Family plumbers since 1998". */
  tagline: "",
  /** Display format, e.g. "(555) 123-4567". The dialled number comes from it. */
  phone: "",
  email: "",
  /** One string per line, e.g. ["12 Main St", "Springfield, IL 62701"]. */
  address: [] as string[],
  /** One string per line, e.g. ["Mon–Fri 8am–5pm", "Sat 9am–1pm"]. */
  hours: [] as string[],
};

/**
 * Main navigation, in order. The links sit in one row from 1024px wide;
 * about five short links plus a short `NAV_CTA` fit there. More than that
 * wraps onto two rows, so check the nav at 1024px after changing these.
 */
export const NAV_LINKS: Link[] = [
  { label: "Home", href: "/" },
  { label: "Example Components", href: "/example-components" },
];

/** Optional button at the end of the nav, e.g. "Call now" or "Get a quote". */
export const NAV_CTA: Link | null = null;

/** Footer links. Defaults to the main navigation. */
export const FOOTER_LINKS: Link[] = NAV_LINKS;

/** Social profiles, e.g. { label: "Facebook", href: "https://…" }. */
export const SOCIAL_LINKS: Link[] = [];

/**
 * Where contact forms send their messages, e.g. a Formspree form URL
 * ("https://formspree.io/f/abcd1234"). While this is "", Lumos's Form
 * still shows its "sent" message but delivers nothing, so the site must
 * not go live with a form until this is set.
 */
export const FORM_ENDPOINT = "";

/** `tel:` link for the business phone, or "" when there is none. */
export const PHONE_HREF = BUSINESS.phone
  ? `tel:${BUSINESS.phone.replace(/[^\d+]/g, "")}`
  : "";
