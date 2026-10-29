"use client";

import { useIsPresentationTool } from "next-sanity/hooks";

// Draft mode outside the Studio (a shared preview link, or the Studio
// closed with the cookie still set): a way back to the published site.
// Inside the Presentation tool the Studio has its own controls.
export function ExitPreview() {
  const inStudio = useIsPresentationTool();
  if (inStudio !== false) return null;
  return (
    <a className="gpill exit-preview text-label" data-size="tap" href="/api/draft-mode/disable">
      Exit preview
    </a>
  );
}
