import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Read } from "@/components/case/Read";
import { Crumb } from "@/components/parts/Crumb";
import { Divider } from "@/components/parts/Divider";
import { Facts } from "@/components/parts/Facts";
import { ProjectRows } from "@/components/parts/ProjectRow";
import { MediaFigure } from "@/components/parts/Media";
import { MockTag } from "@/components/parts/Pills";
import { SIZES } from "@/lib/image";
import { SectionLabel } from "@/components/parts/SectionLabel";
import { caseSlugs, getCase, getWork } from "@/content/get";
import { getDraftFetchOptions } from "@/sanity/live";
import { HeroBeat } from "@/components/case/HeroBeat";

export async function generateStaticParams() {
  return (await caseSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCase(slug);
  return c ? { title: c.title, description: c.lead || undefined, alternates: { canonical: `/work/${slug}` } } : {};
}

/**
 * Case page: crumb → opening (title | lead) → header
 * video → facts → the read → the next project, then the footer (its air
 * row is the 240px gap). Fully prerendered per slug, with no
 * Suspense fallback: a streamed hole showed an empty page (header and
 * cursors only) on load and between cases.
 */
export default async function CasePage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const o = await getDraftFetchOptions();
  const [c, projects] = await Promise.all([getCase(slug, o), getWork(o)]);
  if (!c) notFound();

  // Where this case sits among the live ones, and the one after it.
  const cases = projects.filter((p) => p.href);
  const i = cases.findIndex((p) => p.href === `/work/${slug}`);
  const after = i >= 0 ? cases[(i + 1) % cases.length] : undefined;
  const crumb = {
    count: i >= 0 ? `Project ${i + 1}/${cases.length}` : undefined,
    next: after && after.href !== `/work/${slug}` ? { label: after.title, href: after.href } : undefined,
  };
  const mock = (f: "lead" | "intro" | "caption") => (c.mock?.includes(f) ? "" : undefined);

  return (
    <>
      <Crumb {...crumb} />
      <section className="frame" data-row data-steps aria-labelledby="ttl">
        <div className="side" />
        {/* Nothing written yet beside the title: it takes the full row. */}
        <div className="copen" data-solo={!c.lead && !c.intro ? "" : undefined}>
          <div className="cell ot">
            <span data-enter>
              <SectionLabel as="p" name="Case" />
            </span>
            <h1 id="ttl" className="text-statement" lang={c.lang} data-enter>
              {c.title}
            </h1>
          </div>
          <div className="cell ol">
            {c.lead && (
              <p className="text-lead" data-mock={mock("lead")} data-enter>
                {c.lead}
              </p>
            )}
            {c.intro && (
              <p className="text-body text-mute" data-mock={mock("intro")} data-enter>
                {c.intro}
              </p>
            )}
            {c.mock?.length ? (
              <span data-enter data-mock-only>
                <MockTag>Mock copy from desaak.com · to rewrite</MockTag>
              </span>
            ) : null}
          </div>
        </div>
        <div className="side" />
      </section>
      {(c.hero.video || c.hero.poster) && (
        <section className="frame" data-row aria-label="Project video">
          <div className="side" />
          <HeroBeat>
            {/* The header loop runs at full speed: it was cut for 1×, unlike the project loops. */}
            <div data-enter>
              <MediaFigure
                ratio="wide"
                squareSmall
                sizes={SIZES.wide}
                priority
                poster={c.hero.poster}
                video={c.hero.video}
                videoAv1={c.hero.videoAv1}
                alt={c.hero.alt}
                rate={1}
                caption={c.hero.caption ? <span data-mock={mock("caption")}>{c.hero.caption}</span> : undefined}
              />
            </div>
          </HeroBeat>
          <div className="side" />
        </section>
      )}
      <Facts items={c.facts} />
      <section className="frame" data-row data-steps aria-label="Case study">
        <div className="side" />
        <Read sections={c.sections} />
        <div className="side" />
      </section>
      {/* The next project as its own row, so the page ends on a door, not a bar. */}
      {crumb.next && after && (
        <>
          <Divider label={{ name: "Next project" }} />
          <ProjectRows projects={[after]} label="Next project" next />
        </>
      )}
      {/* No bar at the end: the Next row is the way on and Work in the
          header is the way back. */}
    </>
  );
}
