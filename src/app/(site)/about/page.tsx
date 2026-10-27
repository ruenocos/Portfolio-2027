import type { Metadata } from "next";
import Link from "next/link";
import { PhotoStack } from "@/components/about/PhotoStack";
import { Stickers } from "@/components/about/Stickers";
import { Arrow } from "@/components/parts/Arrow";
import { Divider } from "@/components/parts/Divider";
import { Facts } from "@/components/parts/Facts";
import { Status } from "@/components/parts/Status";
import { getAbout } from "@/content/get";

export const metadata: Metadata = {
  title: "About",
  description: "Wessel Oud, UI/UX and motion designer at WP Masters. Experience, education and what he does off screen.",
};

/**
 * About (v07, approved 2026-10-27): hello + status | the photo stack, three
 * facts, experience (work and school in one list), and the off-screen
 * stickers. Concise on purpose: the toys are the fun, not the copy.
 */
export default async function AboutPage() {
  const c = await getAbout();
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
        <ol className="hist">
          {c.experience.map((j) => (
            <li key={`${j.place}-${j.when}`} className="cell" data-link={j.href ? "" : undefined}>
              <span className="yr text-label text-mute">{j.when}</span>
              <span className="pl text-lead">{j.place}</span>
              <span className="ro text-body text-mute">{j.role}</span>
              {j.href && (
                <Link href={j.href} className="go text-link">
                  {j.cta ?? "Read the case"}
                  <Arrow dir="right" />
                  <span className="sr-only">: {j.place}</span>
                </Link>
              )}
            </li>
          ))}
        </ol>
        <div className="side" />
      </section>
      <Divider label={{ name: "Off screen" }} />
      <Stickers items={c.stickers} />
    </>
  );
}
