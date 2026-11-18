/*
 * Every client-specific fact lives in this file. Nav, Footer, page titles
 * and contact sections all read from here, so a new client means editing
 * this file, not hunting through components.
 *
 * Leave a field as "" until the client confirms it. Empty fields are
 * hidden, never shown as placeholder text. Do not invent business facts.
 */

/** Site name. Appended to every page title and used as `og:site_name`. */
export const SITE_NAME = "Emerald Forest Furnishings";
/** Fallback meta description for pages that don't set their own. */
export const SITE_DESCRIPTION =
  "Custom staircases, solid hardwood doors, cabinets and custom furniture, built by hand in Black Mountain, NC for homes across the Asheville area.";
/** Canonical origin. Resolves canonical URLs, social images, and the sitemap. */
export const SITE_URL = "https://emeraldforestfurnishings.com";
/** BCP 47 locale tag used to format dates and numbers. */
export const SITE_LOCALE = "en-US";
/** Routes excluded from search and the sitemap. Surrounding slashes are ignored. */
export const NOINDEX_ROUTES: string[] = [
  "/404",
  "/sections",
  "/example-components",
  "/hero-options",
];

export type Link = {
  /** Visible link text. */
  label: string;
  /** Link destination. */
  href: string;
  /** Nav only: links shown in a dropdown under this one. */
  children?: Link[];
};

/** How to reach the business. Shown in the footer and contact sections. */
export const BUSINESS = {
  /** One line under the name, e.g. "Family plumbers since 1998". */
  tagline: "Handcrafted staircases, doors and furniture in Black Mountain, NC",
  /** Display format, e.g. "(555) 123-4567". The dialled number comes from it. */
  phone: "(828) 424-5401",
  /** Shown on Contact and in the footer (Noah is fine with it being public). */
  email: "emerald.forest.furnishings@gmail.com",
  /** One string per line, e.g. ["12 Main St", "Springfield, IL 62701"]. */
  address: [] as string[],
  /** One string per line, e.g. ["Mon–Fri 8am–5pm", "Sat 9am–1pm"]. */
  hours: [] as string[],
};

/** `tel:` link for the business phone, or "" when there is none. */
export const PHONE_HREF = BUSINESS.phone
  ? `tel:${BUSINESS.phone.replace(/[^\d+]/g, "")}`
  : "";

/** Every service page, in order. Used for the cross-links at the foot
 *  of each service page and in the footer. */
export const SERVICE_LINKS: Link[] = [
  { label: "Staircases", href: "/custom-staircases/" },
  { label: "Stair Railings", href: "/stair-railings/" },
  { label: "Doors", href: "/custom-doors/" },
  { label: "Kitchens", href: "/custom-kitchens/" },
  { label: "Cabinets & Built-Ins", href: "/custom-cabinets/" },
  { label: "Furniture", href: "/custom-furniture/" },
  { label: "Pergolas", href: "/pergolas/" },
  { label: "Finish Carpentry", href: "/finish-carpentry/" },
  { label: "All Services", href: "/services/" },
];

/**
 * Main navigation, in order. The links sit in one row from 1024px wide;
 * about five short links plus a short `NAV_CTA` fit there. More than that
 * wraps onto two rows, so check the nav at 1024px after changing these.
 * A link with `children` becomes a dropdown (a plain list on phones).
 */
export const NAV_LINKS: Link[] = [
  { label: "Home", href: "/" },
  {
    label: "Services",
    href: "/services/",
    children: SERVICE_LINKS,
  },
  { label: "Portfolio", href: "/portfolio/" },
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
];

/** Optional button at the end of the nav, e.g. "Call now" or "Get a quote". */
export const NAV_CTA: Link | null = { label: "Call 828-424-5401", href: PHONE_HREF };

/** Footer links. Defaults to the main navigation. */
export const FOOTER_LINKS: Link[] = [
  { label: "Home", href: "/" },
  ...SERVICE_LINKS,
  { label: "Portfolio", href: "/portfolio/" },
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
];

/** Towns named on the home and service pages (Google service area). */
export const TOWNS = [
  "Black Mountain",
  "Asheville",
  "Weaverville",
  "Swannanoa",
  "Montreat",
  "Fairview",
  "Hendersonville",
  "Canton",
];

/** Google Business Profile. */
export const GOOGLE_PLACE_ID = "ChIJnQSTRSCl_YYR-DPhdeEKBwU";
export const GOOGLE_PROFILE_URL = `https://www.google.com/maps/place/?q=place_id:${GOOGLE_PLACE_ID}`;
export const GOOGLE_REVIEW_URL = `https://search.google.com/local/writereview?placeid=${GOOGLE_PLACE_ID}`;

/** Social profiles, e.g. { label: "Facebook", href: "https://…" }. */
export const SOCIAL_LINKS: Link[] = [
  { label: "Instagram", href: "https://www.instagram.com/emerald_forest_furnishings/" },
  /* No username set on the page yet; once Noah picks one in Facebook
     (Settings > Username) this can become facebook.com/<name>. */
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61574237970112" },
];

/**
 * Where contact forms send their messages: Web3Forms (free plan, 250 a
 * month). It emails each enquiry to Noah's Gmail and keeps a copy in
 * the Web3Forms dashboard for 30 days, so none is lost if an email
 * goes astray. Works from any host, including the Cloudflare preview.
 * The access key is public by design (it can only send to Noah).
 */
export const FORM_ENDPOINT = "https://api.web3forms.com/submit";
export const WEB3FORMS_KEY = "1c6f7769-1088-465d-8ac1-35b47b6a4e0e";

/**
 * Google Analytics 4 measurement ID (property "Emerald Forest
 * Furnishings", web stream "Website"). The tag loads only in production
 * builds, so local dev visits aren't counted. Set to "" to turn it off.
 */
export const GA_MEASUREMENT_ID = "G-Q30VWBCFFX";
