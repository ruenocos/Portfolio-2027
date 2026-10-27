import { defineQuery } from "next-sanity";

const projectRow = `{
  title, lang, summary, timeline, role, tools, note, label, hasCase,
  "slug": slug.current,
  "poster": poster.asset->url,
  "video": video.asset->url
}`;

export const HOME_QUERY = defineQuery(`{
  "home": *[_id == "home"][0]{
    basedIn, role,
    "reel": { "loop": reel.loop.asset->url, "full": reel.full.asset->url, "poster": reel.poster.asset->url },
    aboutOpener, aboutNext,
    "photos": photos[]{ "src": asset->url, alt },
    focusStatement,
    tracks[]{ key, title, line },
    "archive": archive[]{ "src": asset->url, name }
  },
  "projects": *[_type == "project" && featured == true] | order(order asc) ${projectRow}
}`);

// Work: every project. Featured ones are the selected work, in the home's
// order; the rest are the archive.
export const WORK_QUERY = defineQuery(`{
  "selected": *[_type == "project" && featured == true] | order(order asc) ${projectRow},
  "archive": *[_type == "project" && featured != true] | order(order asc, _createdAt desc) ${projectRow}
}`);
