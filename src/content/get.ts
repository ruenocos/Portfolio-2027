import type { Project } from "@/components/parts/ProjectRow";
import { IS_PRODUCTION } from "@/lib/site";
import { knownTools } from "@/lib/tools";
import { client, urlFor } from "@/sanity/client";
import { cachedSanity, published, type FetchOptions } from "@/sanity/live";
import { ABOUT_QUERY, CASE_QUERY, CASE_SLUGS_QUERY, HOME_QUERY, PLAYGROUND_QUERY, WORK_QUERY } from "@/sanity/queries";
import { FALLBACK_HOME, type HomeContent, type Track } from "./home";
import { FALLBACK_ABOUT, type AboutContent, type Sticker } from "./about";
import { FALLBACK_CASES, type Case, type CaseSection } from "./cases";
import { FALLBACK_POSTS, PLAYGROUND_TARGET, type Post } from "./playground";
import { FALLBACK_PROJECTS } from "./projects";

/** A Sanity image as the queries return it: the asset plus the Studio's crop and focal point. */
type Pic = { asset?: { _ref: string }; crop?: object; hotspot?: object };

type Row = {
  title: string;
  lang?: string;
  summary: string;
  timeline: string;
  role?: string;
  tools?: string[];
  note?: string;
  label?: string;
  hasCase?: boolean;
  slug?: string;
  poster?: Pic;
  video?: string;
};
type HomeDoc = {
  basedIn?: string;
  role?: string[];
  reel?: { loop?: string; full?: string; poster?: string };
  aboutOpener?: string;
  aboutNext?: string;
  photos?: { src?: Pic; alt?: string }[];
  focusStatement?: string;
  tracks?: Partial<Track>[];
  archive?: { src?: string; name?: string }[];
};

const img = (src?: string, w = 1200) => (src ? `${src}?w=${w}&auto=format` : undefined);
// With a ratio the CDN cuts the picture to its frame around the focal point
// set in the Studio; without one it keeps the whole (cropped) picture.
const pic = (p: Pic | undefined, w: number, ratio?: number) =>
  p?.asset ? (ratio ? urlFor(p).width(w).height(Math.round(w / ratio)).fit("crop") : urlFor(p).width(w)).url() : undefined;
const PORTRAIT = 3 / 4;
const hasPic = <T extends { src?: Pic; alt?: string }>(p: T): p is T & { src: Pic; alt: string } => !!p.src?.asset && !!p.alt;
// Where Wessel drops each pin on the media: a little off, like by hand.
const SPOTS = [
  { fx: 0.72, dy: 30, rot: -3 },
  { fx: 0.38, dy: 36, rot: 2.5 },
  { fx: 0.6, dy: 28, rot: -1.5 },
];

function toProject(r: Row, i: number): Project {
  return {
    title: r.title,
    lang: r.lang === "nl" ? "nl" : undefined,
    summary: r.summary,
    timeline: r.timeline,
    role: r.role ?? "",
    tools: knownTools(r.tools ?? []),
    media: { poster: pic(r.poster, 1040, PORTRAIT), video: r.video },
    // Every project has a page; without a written case it's the short one.
    href: r.slug ? `/work/${r.slug}` : undefined,
    label: r.label || `${r.title}, ${r.timeline}.`,
    note: r.note ? { text: r.note, spot: SPOTS[i % SPOTS.length] } : undefined,
  };
}

/**
 * Home content: Sanity first, the approved copy for whatever is still empty.
 * If Sanity can't be reached the page still renders, from the fallback.
 */
export async function getHome(o: FetchOptions = published): Promise<HomeContent> {
  const f = FALLBACK_HOME;
  let doc: HomeDoc | null = null;
  let rows: Row[] = [];
  try {
    const { data } = await cachedSanity({ query: HOME_QUERY, perspective: o.perspective, stega: o.stega });
    const d = data as unknown as { home: HomeDoc | null; projects: Row[] | null };
    doc = d.home;
    rows = d.projects ?? [];
  } catch (e) {
    console.warn("Home: Sanity unavailable, using the fallback content.", e);
  }
  const h = doc ?? {};
  const photos = (h.photos ?? []).filter(hasPic);
  const archive = (h.archive ?? []).filter((c): c is { src: string; name: string } => !!c.src && !!c.name);
  const reel = h.reel?.loop || h.reel?.full ? { ...h.reel, poster: img(h.reel.poster, 1600) } : f.hero.reel;

  return {
    hero: {
      basedIn: h.basedIn || f.hero.basedIn,
      role: h.role?.length === 2 ? [h.role[0], h.role[1]] : f.hero.role,
      reel,
    },
    about: {
      opener: h.aboutOpener || f.about.opener,
      next: h.aboutNext || f.about.next,
      photos: photos.length ? photos.map((p) => ({ alt: p.alt, src: pic(p.src, 760, PORTRAIT)! })) : f.about.photos,
    },
    projects: rows.length ? rows.map(toProject) : f.projects,
    focus: {
      statement: h.focusStatement || f.focus.statement,
      tracks: f.focus.tracks.map((t) => {
        const s = h.tracks?.find((x) => x.key === t.key);
        return { key: t.key, title: s?.title || t.title, line: s?.line || t.line };
      }),
    },
    archive: archive.length ? archive.map((c) => ({ ...c, src: img(c.src, 640)! })) : f.archive,
  };
}

/** Work: every project, in the Studio's drag order. */
export async function getWork(o: FetchOptions = published): Promise<Project[]> {
  let rows: Row[] | null = null;
  try {
    const { data } = await cachedSanity({ query: WORK_QUERY, perspective: o.perspective, stega: o.stega });
    rows = data as unknown as Row[] | null;
  } catch (e) {
    console.warn("Work: Sanity unavailable, using the fallback content.", e);
  }
  return rows?.length ? rows.map(toProject) : FALLBACK_PROJECTS;
}

type CaseDoc = {
  title: string;
  lang?: string;
  lead?: string;
  intro?: string;
  role?: string;
  scope?: string;
  timeline?: string;
  hero?: { video?: string; poster?: Pic; alt?: string; caption?: string };
  sections?: (Omit<CaseSection, "key" | "figure"> & {
    _key: string;
    figure?: { src?: string; alt?: string; caption?: string; width?: number; height?: number };
  })[];
};

// Field by field: whatever Sanity hasn't filled yet keeps the draft's.
function toCase(slug: string, d: CaseDoc): Case {
  const fb = FALLBACK_CASES.find((c) => c.slug === slug);
  const fact = (label: string, value?: string) =>
    value ? { label, value } : (fb?.facts.find((f) => f.label === label) ?? { label, value: "" });
  const poster = pic(d.hero?.poster, 1800, 16 / 9);
  return {
    slug,
    title: d.title || fb?.title || slug,
    lang: d.lang === "nl" ? "nl" : d.lang ? undefined : fb?.lang,
    lead: d.lead || fb?.lead || "",
    intro: d.intro || fb?.intro || "",
    mock: fb?.mock?.filter((m) => (m === "lead" && !d.lead) || (m === "intro" && !d.intro) || (m === "caption" && !poster)),
    facts: [fact("Role", d.role), fact("Scope", d.scope), fact("Timeline", d.timeline)],
    hero: poster
      ? { video: d.hero?.video, poster, alt: d.hero?.alt ?? "", caption: d.hero?.caption ?? "" }
      : fb?.hero ?? { poster: undefined, alt: "", caption: "" },
    sections: (d.sections ?? [])
      .filter((s) => s.name && s.heading)
      .map((s) => ({
        key: s._key,
        name: s.name,
        heading: s.heading,
        body: s.body ?? "",
        note: s.note,
        figure:
          s.figure?.src && s.figure.alt
            ? {
                src: img(s.figure.src, 1600)!,
                alt: s.figure.alt,
                caption: s.figure.caption ?? "",
                width: s.figure.width ?? 1600,
                height: s.figure.height ?? 1000,
              }
            : undefined,
      })),
  };
}

/**
 * A case page: Sanity once it has the story, the mock draft until then. A
 * project without either gets the short page: its row's title, summary,
 * video and facts, no read.
 */
export async function getCase(slug: string, o: FetchOptions = published): Promise<Case | null> {
  try {
    const { data } = await cachedSanity({ query: CASE_QUERY, params: { slug }, perspective: o.perspective, stega: o.stega });
    const d = data as unknown as CaseDoc | null;
    if (d?.sections?.some((s) => s.name && s.heading)) return toCase(slug, d);
  } catch (e) {
    console.warn(`Case ${slug}: Sanity unavailable, using the fallback content.`, e);
  }
  const fb = FALLBACK_CASES.find((c) => c.slug === slug);
  if (fb) return fb;
  const p = (await getWork(o)).find((x) => x.href === `/work/${slug}`);
  return p ? shortCase(slug, p) : null;
}

function shortCase(slug: string, p: Project): Case {
  return {
    slug,
    title: p.title,
    lang: p.lang,
    lead: "",
    intro: p.summary,
    facts: [
      { label: "Role", value: p.role || undefined },
      { label: "Scope", value: undefined },
      { label: "Timeline", value: p.timeline || undefined },
    ],
    hero: { poster: p.media.poster, video: p.media.video, alt: "", caption: "" },
    sections: [],
  };
}

/** Case pages to prebuild: one per project, plus the drafts in code. */
export async function caseSlugs(): Promise<string[]> {
  let live: string[] = [];
  try {
    live = (await client.fetch<string[] | null>(CASE_SLUGS_QUERY)) ?? [];
  } catch (e) {
    console.warn("Case slugs: Sanity unavailable, using the fallback list.", e);
  }
  const code = FALLBACK_PROJECTS.flatMap((p) => (p.href ? [p.href.replace("/work/", "")] : []));
  return [...new Set([...FALLBACK_CASES.map((c) => c.slug), ...code, ...live])];
}

type AboutDoc = {
  hello?: string;
  lead?: string;
  photos?: { src?: Pic; alt?: string }[];
  facts?: { label?: string; value?: string; sub?: string }[];
  experience?: { when?: string; place?: string; role?: string }[];
  stickers?: { text?: string; tone?: Sticker["tone"]; size?: Sticker["size"] }[];
};

/** About: Sanity first, the approved v07 copy for whatever is still empty. */
export async function getAbout(o: FetchOptions = published): Promise<AboutContent> {
  const f = FALLBACK_ABOUT;
  let d: AboutDoc = {};
  try {
    const { data } = await cachedSanity({ query: ABOUT_QUERY, perspective: o.perspective, stega: o.stega });
    d = (data as unknown as AboutDoc | null) ?? {};
  } catch (e) {
    console.warn("About: Sanity unavailable, using the fallback content.", e);
  }
  const photos = (d.photos ?? []).filter(hasPic);
  const facts = (d.facts ?? []).filter((x) => x.label && x.value);
  const jobs = (d.experience ?? []).filter((j) => j.when && j.place && j.role);
  const stickers = (d.stickers ?? []).filter((s): s is Sticker => !!s.text);
  return {
    hello: d.hello || f.hello,
    lead: d.lead || f.lead,
    photos: photos.length ? photos.map((p) => ({ alt: p.alt, src: pic(p.src, 760, PORTRAIT)! })) : f.photos,
    facts: facts.length ? facts.map((x) => ({ label: x.label!, value: x.value, sub: x.sub })) : f.facts,
    experience: jobs.length
      ? jobs.map((j) => ({
          when: j.when!,
          place: j.place!,
          role: j.role!,
        }))
      : f.experience,
    stickers: stickers.length
      ? stickers.map((s) => ({
          text: s.text,
          tone: s.tone ?? "tang",
          // Stickers saved before sizes existed take the size of the same word here.
          size: s.size ?? f.stickers.find((x) => x.text === s.text)?.size,
        }))
      : f.stickers,
  };
}

/** Playground posts: Sanity's, or the v08 placeholders while there are none. */
export async function getPosts(o: FetchOptions = published): Promise<Post[]> {
  try {
    const { data } = await cachedSanity({ query: PLAYGROUND_QUERY, perspective: o.perspective, stega: o.stega });
    const rows = (data as unknown as { title: string; src: string; video?: string; w?: number; h?: number }[] | null) ?? [];
    if (rows.length) {
      const real: Post[] = rows.map((r) => ({ title: r.title, src: img(r.src, 640), video: r.video, ar: r.w && r.h ? r.w / r.h : 1 }));
      // Until there are enough, previews top the board up with the prompt
      // cards (what kind of piece fits). The live site shows only real posts.
      if (IS_PRODUCTION) return real;
      const prompts = FALLBACK_POSTS.filter((p) => p.mock).slice(0, Math.max(0, PLAYGROUND_TARGET - real.length));
      return [...real, ...prompts];
    }
  } catch (e) {
    console.warn("Playground: Sanity unavailable, using the fallback posts.", e);
  }
  return FALLBACK_POSTS;
}
