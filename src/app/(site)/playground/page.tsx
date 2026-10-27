import type { Metadata } from "next";
import { Board } from "@/components/playground/Board";
import { getPosts } from "@/content/get";
import { getDraftFetchOptions } from "@/sanity/live";

export const metadata: Metadata = {
  title: "Playground",
  description: "Experiments, loops and pictures on one big board you can drag around.",
};

// Playground (v08): no copy, just the board. It fills the screen under the
// header, so this page has no footer (Contact goes to the home's).
export default async function PlaygroundPage() {
  const posts = await getPosts(await getDraftFetchOptions());
  return (
    <>
      <h1 className="sr-only">Playground</h1>
      <section className="frame" data-row aria-label="Playground">
        <div className="side" />
        <Board posts={posts} />
        <div className="side" />
      </section>
    </>
  );
}
