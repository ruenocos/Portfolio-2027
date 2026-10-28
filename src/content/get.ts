import type { Project } from "@/components/parts/ProjectRow";
import { knownTools } from "@/lib/tools";
import { cachedSanity, published, type FetchOptions } from "@/sanity/live";
import { ABOUT_QUERY, CASE_QUERY, HOME_QUERY, PLAYGROUND_QUERY, WORK_QUERY } from "@/sanity/queries";
import { FALLBACK_HOME, type HomeContent, type Track } from "./home";
import { FALLBACK_ABOUT, type AboutContent, type Sticker } from "./about";
import { FALLBACK_CASES, type Case, type CaseSection } from "./cases";
import { FALLBACK_POSTS, type Post } from "./playground";
import { FALLBACK_ARCHIVE, FALLBACK_PROJECTS } from "./projects";

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
  poster?: string;
  video?: string;
};
type HomeDoc = {
  basedIn?: string;
  role?: string[];
  reel?: { loop?: string; full?: string; poster?: string };
  aboutOpener?: string;
  aboutNext?: string;
  photos?: { src?: string; alt?: string }[];
  focusStatement?: string;
  tracks?: Partial<Track>[];
  archive?: { src?: string; name?: string }[];
};

const img = (src?: string, w = 1200) => (src ? `${src}?w=${w}&auto=format` : undefined);
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
    media: { poster: img(r.poster, 1040), video: r.video },
    href: r.hasCase && r.slug ? `/work/${r.slug}` : undefined,
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
  const photos = (h.photos ?? []).filter((p): p is { src: string; alt: string } => !!p.src && !!p.alt);
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
      photos: photos.length ? photos.map((p) => ({ ...p, src: img(p.src, 760)! })) : f.about.photos,
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

/**
 * Work: the selected work and the archive. Each list falls back on its own:
 * the placeholder archive shows only while Sanity has no archive projects.
 */
export async function getWork(o: FetchOptions = published): Promise<{ selected: Project[]; archive: Project[] }> {
  let d: { selected: Row[] | null; archive: Row[] | null } = { selected: null, archive: null };
  try {
    const { data } = await cachedSanity({ query: WORK_QUERY, perspective: o.perspective, stega: o.stega });
    d = data as unknown as typeof d;
  } catch (e) {
    console.warn("Work: Sanity unavailable, using the fallback content.", e);
  }
  return {
    selected: d.selected?.length ? d.selected.map(toProject) : FALLBACK_PROJECTS,
    archive: d.archive?.length ? d.archive.map(toProject) : FALLBACK_ARCHIVE,
  };
}

type CaseDoc = {
  title: string;
  lang?: string;
  lead?: string;
  intro?: string;
  role?: string;
  scope?: string;
  timeline?: string;
  hero?: { video?: string; poster?: string; alt?: string; caption?: string };
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
  const poster = img(d.hero?.poster, 1800);
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

/** A case page: Sanity once it has the story, the mock draft until then. */
export async function getCase(slug: string, o: FetchOptions = published): Promise<Case | null> {
  try {
    const { data } = await cachedSanity({ query: CASE_QUERY, params: { slug }, perspective: o.perspective, stega: o.stega });
    const d = data as unknown as CaseDoc | null;
    if (d?.sections?.some((s) => s.name && s.heading)) return toCase(slug, d);
  } catch (e) {
    console.warn(`Case ${slug}: Sanity unavailable, using the fallback content.`, e);
  }
  return FALLBACK_CASES.find((c) => c.slug === slug) ?? null;
}

export const caseSlugs = () => FALLBACK_CASES.map((c) => c.slug);

type AboutDoc = {
  hello?: string;
  lead?: string;
  photos?: { src?: string; alt?: string }[];
  facts?: { label?: string; value?: string; sub?: string }[];
  experience?: { when?: string; place?: string; role?: string; slug?: string; hasCase?: boolean }[];
  stickers?: { text?: string; tone?: Sticker["tone"]; shape?: Sticker["shape"]; size?: Sticker["size"] }[];
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
  const photos = (d.photos ?? []).filter((p): p is { src: string; alt: string } => !!p.src && !!p.alt);
  const facts = (d.facts ?? []).filter((x) => x.label && x.value);
  const jobs = (d.experience ?? []).filter((j) => j.when && j.place && j.role);
  const stickers = (d.stickers ?? []).filter((s): s is Sticker => !!s.text);
  return {
    hello: d.hello || f.hello,
    lead: d.lead || f.lead,
    photos: photos.length ? photos.map((p) => ({ ...p, src: img(p.src, 760)! })) : f.photos,
    facts: facts.length ? facts.map((x) => ({ label: x.label!, value: x.value, sub: x.sub })) : f.facts,
    experience: jobs.length
      ? jobs.map((j) => ({
          when: j.when!,
          place: j.place!,
          role: j.role!,
        }))
      : f.experience,
    stickers: stickers.length
      ? stickers.map((s) => {
          // A sticker without a shape yet takes the approved one for its words.
          const was = f.stickers.find((x) => x.text === s.text);
          return { text: s.text, tone: s.tone ?? "tang", shape: s.shape ?? was?.shape, size: s.size ?? was?.size };
        })
      : f.stickers,
  };
}

/** Playground posts: Sanity's, or the v08 placeholders while there are none. */
export async function getPosts(o: FetchOptions = published): Promise<Post[]> {
  try {
    const { data } = await cachedSanity({ query: PLAYGROUND_QUERY, perspective: o.perspective, stega: o.stega });
    const rows = (data as unknown as { title: string; src: string; video?: string; w?: number; h?: number }[] | null) ?? [];
    if (rows.length)
      return rows.map((r) => ({ title: r.title, src: img(r.src, 640), video: r.video, ar: r.w && r.h ? r.w / r.h : 1 }));
  } catch (e) {
    console.warn("Playground: Sanity unavailable, using the fallback posts.", e);
  }
  return FALLBACK_POSTS;
}
