import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { SanityLive } from "@/sanity/live";
import { ExitPreview } from "./ExitPreview";

// Live content updates for everyone, click-to-edit overlays while editing.
export async function LiveEditing() {
  const { isEnabled } = await draftMode();

  return (
    <>
      <SanityLive includeDrafts={isEnabled} />
      {isEnabled && (
        <>
          <VisualEditing />
          <ExitPreview />
        </>
      )}
    </>
  );
}
