import type { ToolId } from "@/lib/tools";

export type Project = {
  title: string;
  /** Set for Dutch titles, so hyphens:auto can break the long compounds. */
  lang?: string;
  summary: string;
  timeline: string;
  role: string;
  tools: ToolId[];
  /** peek: the small copy of the loop, for thumbnails (Work's rows). */
  media: { poster?: string; video?: string; videoAv1?: string; focus?: string; peek?: string; peekAv1?: string };
  /** The case page. */
  href: string;
  /** Read out for the media link, e.g. "De Saak case study. Design, dev and SEO, 2023 to now." */
  label: string;
  /** Wessel's pin on the media. spot: where it lands, a little off, like it was dropped by hand. */
  note?: { text: string; spot?: { fx: number; dy: number; rot: number } };
  /** Which of these fields are placeholder copy (DESIGN.md §2.8). */
  mock?: ("summary" | "role" | "note" | "media")[];
};
