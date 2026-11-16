import { TOWNS } from "../consts.ts";

/**
 * One FAQ entry. The same array renders the visible accordion and the
 * FAQPage structured data, so the two cannot drift apart.
 */
export interface FaqItem {
  /** The question, shown as the accordion heading. */
  question: string;
  /** The answer as inline HTML (text and links only). */
  answer: string;
}

/** "Black Mountain, Asheville, … and Fairview", from `TOWNS`. */
export const TOWN_LIST = `${TOWNS.slice(0, -1).join(", ")} and ${TOWNS.at(-1)}`;

/** Placeholder copy still waiting on the client, e.g. "TODO (Noah): …". */
export const isTodo = (text: string) => text.includes("TODO (");

/**
 * The items to show on the page. Answers that are still a TODO show in
 * dev, so they stay visible while editing, and never in a build.
 */
export const visibleFaqs = (items: FaqItem[]) =>
  import.meta.env.DEV ? items : items.filter((item) => !isTodo(item.answer));

/** An answer's HTML as plain text, for structured data. */
export const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
