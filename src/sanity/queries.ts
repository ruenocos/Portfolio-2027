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

export const CASE_QUERY = defineQuery(`*[_type == "project" && hasCase == true && slug.current == $slug][0]{
  title, lang, lead, intro, role, scope, timeline,
  "hero": { "video": hero.video.asset->url, "poster": hero.poster.asset->url, "alt": hero.alt, "caption": hero.caption },
  "sections": sections[]{ _key, name, heading, body, note,
    "figure": figure{ "src": asset->url, alt, caption, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height } }
}`);


export const ABOUT_QUERY = defineQuery(`*[_id == "about"][0]{
  hello, lead,
  "photos": photos[]{ "src": asset->url, alt },
  facts[]{ label, value, sub },
  experience[]{ when, place, role, "slug": case->slug.current, "hasCase": case->hasCase },
  stickers[]{ text, tone, size }
}`);

export const PLAYGROUND_QUERY = defineQuery(`*[_type == "playgroundPiece" && defined(image.asset)] | order(order asc){
  title, "src": image.asset->url, "video": video.asset->url,
  "w": image.asset->metadata.dimensions.width, "h": image.asset->metadata.dimensions.height
}`);
