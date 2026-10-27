import type { Project } from "@/components/parts/ProjectRow";
import { knownTools } from "@/lib/tools";
import { cachedSanity, published } from "@/sanity/live";
import { HOME_QUERY } from "@/sanity/queries";
import { FALLBACK_HOME, type HomeContent, type Track } from "./home";

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
export async function getHome(): Promise<HomeContent> {
  const f = FALLBACK_HOME;
  let doc: HomeDoc | null = null;
  let rows: Row[] = [];
  try {
    const { data } = await cachedSanity({ query: HOME_QUERY, perspective: published.perspective, stega: false });
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
