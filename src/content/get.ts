import { defineQuery } from "next-sanity";
import { client } from "@/sanity/client";
import { projects as placeholderProjects, site as placeholderSite, type Project, type Site } from "./site";

// Content comes from Sanity. Anything not filled in there yet falls back
// to the placeholders in ./site, so the site never renders empty.

const fetchOptions = { next: { revalidate: 60 } };

const siteQuery = defineQuery(`*[_id == "siteSettings"][0]{
  name, role, headline, intro, positioning, email, linkedin
}`);

const projectsQuery = defineQuery(`*[_type == "caseStudy" && defined(slug.current)] | order(order asc){
  title, "slug": slug.current, short, kind, summary, stat, url, nda, featured,
  "cover": cover{ alt, "image": image.asset->url, "video": video.asset->url }
}`);

type SanityProject = {
  title: string;
  slug: string;
  short?: string;
  kind?: string;
  summary?: string;
  stat?: { value?: string; label?: string };
  url?: string;
  nda?: boolean;
  featured?: boolean;
  cover?: { alt?: string; image?: string; video?: string };
};

async function safeFetch<T>(query: string): Promise<T | null> {
  try {
    return await client.fetch<T>(query, {}, fetchOptions);
  } catch (error) {
    console.warn("Sanity fetch failed, using placeholders:", error);
    return null;
  }
}

export async function getSite(): Promise<Site> {
  const data = await safeFetch<Partial<Site> | null>(siteQuery);
  const filled = Object.fromEntries(Object.entries(data ?? {}).filter(([, value]) => value));
  return { ...placeholderSite, ...filled };
}

function toProject(p: SanityProject): Project {
  const coverSrc = p.cover?.video ?? p.cover?.image;
  const visual: Project["visual"] = p.nda
    ? "locked"
    : coverSrc
      ? "media"
      : p.stat?.value
        ? "stat"
        : "browser";

  return {
    slug: p.slug,
    short: p.short ?? p.title,
    kind: p.kind ?? "",
    title: p.title,
    summary: p.summary ?? "",
    visual,
    stat: p.stat?.value ? { value: p.stat.value, label: p.stat.label ?? "" } : undefined,
    cover: coverSrc ? { src: coverSrc, alt: p.cover?.alt ?? "", video: Boolean(p.cover?.video) } : undefined,
    url: p.url?.replace(/^https?:\/\//, ""),
    nda: p.nda,
  };
}

export async function getProjects({ featuredOnly = false } = {}): Promise<Project[]> {
  const data = await safeFetch<SanityProject[]>(projectsQuery);
  if (!data?.length) return placeholderProjects;
  return data.filter((p) => !featuredOnly || p.featured !== false).map(toProject);
}

export async function getProject(slug: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug);
}
