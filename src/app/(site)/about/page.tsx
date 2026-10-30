import type { Metadata } from "next";
import { History } from "@/components/about/History";
import { PhotoStack } from "@/components/about/PhotoStack";
import { Stickers } from "@/components/about/Stickers";
import { Divider } from "@/components/parts/Divider";
import { Facts } from "@/components/parts/Facts";
import { Status } from "@/components/parts/Status";
import { getAbout } from "@/content/get";
import { getDraftFetchOptions } from "@/sanity/live";

export const metadata: Metadata = {
  title: "About",
  description: "I’m Wessel, a UI/UX and motion designer at WP Masters. Where I’ve worked, what I studied and what I do off screen.",
  alternates: { canonical: "/about" },
};

/**
 * About: hello + status | the photo stack, three
 * facts, experience (work and school in one list), and the off-screen
 * stickers. Concise on purpose: the toys are the fun, not the copy.
 */
export default async function AboutPage() {
  const c = await getAbout(await getDraftFetchOptions());
  return (
    <>
      <section className="frame" data-row aria-labelledby="ab-hi">
        <div className="side" />
        <div className="abhero">
          <div className="cell say">
            <h1 id="ab-hi" className="text-statement" data-enter>
              {c.hello}
            </h1>
            <p className="text-lead" data-enter>
              {c.lead}
            </p>
            <Status className="text-mute" />
          </div>
          <PhotoStack photos={c.photos} />
        </div>
        <div className="side" />
      </section>
      <Facts items={c.facts} label="In short" />
      <Divider label={{ name: "Experience" }} />
      <section className="frame" data-row aria-label="Experience">
        <div className="side" />
        <History jobs={c.experience} />
        <div className="side" />
      </section>
      <Divider label={{ name: "Off screen" }} />
      <Stickers items={c.stickers} />
    </>
  );
}
