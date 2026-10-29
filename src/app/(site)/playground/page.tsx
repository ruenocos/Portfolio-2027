import type { Metadata } from "next";
import { Board } from "@/components/playground/Board";
import { getPosts } from "@/content/get";
import { getDraftFetchOptions } from "@/sanity/live";

export const metadata: Metadata = {
  title: "Playground",
  description: "Experiments, loops and pictures on one big board you can drag around.",
  alternates: { canonical: "/playground" },
};

// Playground: a title row like Work's (Statement title, one hint in Label
// style), then the board, which fills the rest of the screen under the
// header. This page has no footer (Contact goes to the home's).
export default async function PlaygroundPage() {
  const posts = await getPosts(await getDraftFetchOptions());
  return (
    <section className="frame" data-row aria-labelledby="pg-h">
      <div className="side" />
      <div className="pgcol">
        <div className="cell whero pghead bg-dots">
          <h1 id="pg-h" className="text-statement" data-enter>
            Playground
          </h1>
          <p className="text-label text-mute" data-enter>
            Drag the board. Tap a tile to open it.
          </p>
        </div>
        <Board posts={posts} />
      </div>
      <div className="side" />
    </section>
  );
}
