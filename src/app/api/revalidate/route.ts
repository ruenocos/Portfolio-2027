import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { SANITY_TAG } from "@/sanity/live";

// Sanity calls this on every publish (webhook in sanity.io/manage > API >
// Webhooks, signed with SANITY_REVALIDATE_SECRET). It drops all Sanity content
// at once, so every page that shows the changed project or page is fresh on
// its next visit, whether or not anyone had the site open when you published.
export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ message: "SANITY_REVALIDATE_SECRET is not set" }, { status: 500 });
  const { isValidSignature } = await parseBody(req, secret);
  if (!isValidSignature) return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  revalidateTag(SANITY_TAG, { expire: 0 });
  return NextResponse.json({ revalidated: SANITY_TAG });
}
