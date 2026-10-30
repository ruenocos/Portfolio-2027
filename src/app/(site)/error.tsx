"use client";

import Link from "next/link";
import { Arrow } from "@/components/parts/Arrow";
import { Hop } from "@/components/shell/Hop";
import { Row } from "@/components/shell/Row";

// Retry, or a way home for when retrying doesn't help. retry() fetches the
// page again; reset() would only re-render what already failed.
export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  return (
    <Row as="section" className="p-inset min-h-[60svh] flex flex-col justify-end gap-4">
      <p className="text-label text-mute">
        <span className="text-tang-ink">#</span> Error
      </p>
      <h1 className="text-statement">Something broke on this page.</h1>
      <p className="text-body">
        <button type="button" onClick={retry} className="text-link text-grape min-h-tap cursor-pointer">
          Try again
        </button>
        , or{" "}
        <Link href="/" className="text-link text-grape py-3">
          <Hop text="go back home" /> <Arrow dir="right" />
        </Link>
      </p>
    </Row>
  );
}
