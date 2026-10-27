"use client";

import { Row } from "@/components/shell/Row";

// Proposed copy, marked data-mock until Wons picks the wording.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Row as="section" className="p-inset min-h-[60svh] flex flex-col justify-end gap-4" data-mock>
      <p className="text-label text-mute">
        <span className="text-tang-ink">#</span> Error
      </p>
      <h1 className="text-statement">Something broke on this page.</h1>
      <button type="button" onClick={reset} className="text-label text-grape self-start min-h-tap cursor-pointer">
        Try again
      </button>
    </Row>
  );
}
