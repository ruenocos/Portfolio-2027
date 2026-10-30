import type { Metadata } from "next";
import { Board } from "@/components/playground/Board";
import { getPosts } from "@/content/get";
import { getDraftFetchOptions } from "@/sanity/live";

export const metadata: Metadata = {
  title: "Playground",
  description: "Experiments, loops and pictures on one big board you can drag around.",
  alternates: { canonical: "/playground" },
};

// Playground: one full-screen canvas under the header, edge to edge, like a
// Figma file. The title sits on it as a small chip, top left; the zoom pill
// floats bottom centre. The board holds the wheel, so the footer below is
// reached by Contact, which scrolls down to it.
export default async function PlaygroundPage() {
  const posts = await getPosts(await getDraftFetchOptions());
  return (
    <section className="pgfull" aria-labelledby="pg-h">
      <div className="pgchip" data-enter>
        <h1 id="pg-h" className="text-small">
          Playground
        </h1>
        <p className="text-micro text-mute">Drag around, pinch to zoom, tap to open.</p>
      </div>
      <Board posts={posts} />
    </section>
  );
}
