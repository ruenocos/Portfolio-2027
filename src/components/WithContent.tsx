import { draftMode } from "next/headers";
import { Suspense, type ReactNode } from "react";
import { getDraftFetchOptions, published, type FetchOptions } from "@/sanity/live";

type Render = (options: FetchOptions) => Promise<ReactNode>;

// Renders with published content (cached), or with drafts while editing.
export async function WithContent({ render }: { render: Render }) {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return render(published);

  return (
    <Suspense fallback={null}>
      <Drafts render={render} />
    </Suspense>
  );
}

async function Drafts({ render }: { render: Render }) {
  return render(await getDraftFetchOptions());
}
