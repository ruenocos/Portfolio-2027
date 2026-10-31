import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { SanityLive } from "@/sanity/live";

// Live drafts and click-to-edit, only while editing (draft mode). Visitors
// get neither: no live client or open connection on every page. Published
// changes reach them through Sanity's webhook (app/api/revalidate).
export async function LiveEditing() {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return null;

  return (
    <>
      <SanityLive includeDrafts />
      <VisualEditing />
    </>
  );
}
