import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Read } from "@/components/case/Read";
import { Crumb } from "@/components/parts/Crumb";
import { Divider } from "@/components/parts/Divider";
import { Facts } from "@/components/parts/Facts";
import { ProjectRows } from "@/components/parts/ProjectRow";
import { MediaFigure } from "@/components/parts/Media";
import { MockTag } from "@/components/parts/Pills";
import { caseSlugs, getCase, getWork } from "@/content/get";
import { getDraftFetchOptions } from "@/sanity/live";
import { HeroBeat } from "@/components/case/HeroBeat";

export async function generateStaticParams() {
  return (await caseSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const c = await getCase((await params).slug);
  return c ? { title: c.title, description: c.lead || undefined } : {};
}

/**
 * Case page (case-study-spec v02): crumb → opening (title | lead) → header
 * video → facts → the read → the crumb again, then the footer (its air row
 * is the spec's 240px gap).
 */
export default function CasePage({ params }: PageProps<"/work/[slug]">) {
  // The slug is URL data: behind Suspense so the shell can show at once.
  return (
    <Suspense>
      <Case params={params} />
    </Suspense>
  );
}

async function Case({ params }: Pick<PageProps<"/work/[slug]">, "params">) {
  const { slug } = await params;
  const o = await getDraftFetchOptions();
  const [c, { selected }] = await Promise.all([getCase(slug, o), getWork(o)]);
  if (!c) notFound();

  // Where this case sits in the selected work, and the one after it.
  const i = selected.findIndex((p) => p.href === `/work/${slug}`);
  const after = i >= 0 ? selected[(i + 1) % selected.length] : undefined;
  const crumb = {
    count: i >= 0 ? `Case ${i + 1}/${selected.length}` : undefined,
    next: after && after.href !== `/work/${slug}` ? { label: after.title, href: after.href } : undefined,
  };
  const mock = (f: "lead" | "intro" | "caption") => (c.mock?.includes(f) ? "" : undefined);

  return (
    <>
      <Crumb {...crumb} />
      <section className="frame" data-row aria-labelledby="ttl">
        <div className="side" />
        <div className="copen">
          <div className="cell ot">
            <p className="text-label" data-enter>
              <span className="text-tang-ink" aria-hidden="true">
                #
              </span>{" "}
              Case · {c.title}
            </p>
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
                poster={c.hero.poster}
                video={c.hero.video}
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
      <section className="frame" data-row aria-label="Case study">
        <div className="side" />
        <Read sections={c.sections} />
        <div className="side" />
      </section>
      {/* The next case as its own row, so the read ends on a door, not a bar. */}
      {crumb.next && after && (
        <>
          <Divider label={{ name: "Next case" }} />
          <ProjectRows projects={[after]} label="Next case" />
        </>
      )}
      <Crumb {...crumb} label="Case navigation, end" />
    </>
  );
}
