import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { SANITY_TAG } from "@/sanity/live";

// Sanity calls this on every publish, unpublish or delete (a webhook in
// sanity.io/manage, signed with SANITY_REVALIDATE_SECRET). Visitors have no
// live connection, so this is how a published change reaches the pages:
// they're served from cache until then.
export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return new Response("SANITY_REVALIDATE_SECRET is not set", { status: 500 });
  // Waits until the change can be read back, so the refresh doesn't cache the old version.
  const { isValidSignature } = await parseBody(req, secret, true);
  if (!isValidSignature) return new Response("Invalid signature", { status: 401 });
  // Stale-while-revalidate: the next visit gets the old page once while the new one renders.
  revalidateTag(SANITY_TAG, "max");
  return Response.json({ revalidated: SANITY_TAG });
}
