import { cookies, draftMode } from "next/headers";
import type { ClientReturn, QueryParams } from "next-sanity";
import {
  defineLive,
  resolvePerspectiveFromCookies,
  resolveVariantFromCookies,
  type LivePerspective,
  type StrictDefinedFetchType,
} from "next-sanity/live";
import { client } from "./client";

// Viewer token, set in Vercel's environment variables. Without it the
// site still works, it just can't show drafts or live-edit.
export const token = process.env.SANITY_API_READ_TOKEN;

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({ perspective: "published" }),
  browserToken: token,
  serverToken: token,
  strict: true,
});

// Results typed by `npm run typegen`, without the stega brand: stega is
// only on in draft mode, and the client's filter (client.ts) keeps the
// fields the code branches on clean.
type TypedFetch = <const Q extends string>(
  options: FetchOptions & { query: Q; params?: QueryParams },
) => Promise<{ data: ClientReturn<Q, unknown> }>;

// The one shared cache boundary for Sanity content.
export const cachedSanity = (async (options) => {
  "use cache";
  return sanityFetch(options);
}) as StrictDefinedFetchType as TypedFetch;

export interface FetchOptions {
  perspective: LivePerspective;
  variant?: string;
  stega: boolean;
}

export const published: FetchOptions = { perspective: "published", stega: false };

// Draft mode is on while editing in the Studio's Presentation tool.
export async function getDraftFetchOptions(): Promise<FetchOptions> {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return published;

  const jar = await cookies();
  const perspective = await resolvePerspectiveFromCookies({ cookies: jar });
  const variant = await resolveVariantFromCookies({ cookies: jar });
  return { perspective: perspective ?? "drafts", variant, stega: true };
}
