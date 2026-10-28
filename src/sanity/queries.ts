import { defineQuery } from "next-sanity";

// Pictures come as the image itself (asset, crop, hotspot), so the site can
// honour the crop and focal point set in the Studio.
const pic = `{ asset, crop, hotspot }`;

const projectRow = `{
  title, lang, summary, timeline, role, tools, note, label, hasCase,
  "slug": slug.current,
  "poster": poster${pic},
  "video": video.asset->url
}`;

export const HOME_QUERY = defineQuery(`{
  "home": *[_id == "home"][0]{
    basedIn, role,
    "reel": { "loop": reel.loop.asset->url, "full": reel.full.asset->url, "poster": reel.poster.asset->url },
    aboutOpener, aboutNext,
    "photos": photos[]{ "src": @${pic}, alt },
    focusStatement,
    tracks[]{ key, title, line },
    "archive": archive[]{ "src": asset->url, name }
  },
  "projects": *[_type == "project" && featured == true] | order(orderRank) ${projectRow}
}`);

// Work: every project. Featured ones are the selected work, in the home's
// order; the rest are the archive.
export const WORK_QUERY = defineQuery(`{
  "selected": *[_type == "project" && featured == true] | order(orderRank) ${projectRow},
  "archive": *[_type == "project" && featured != true] | order(orderRank) ${projectRow}
}`);

export const CASE_QUERY = defineQuery(`*[_type == "project" && hasCase == true && slug.current == $slug][0]{
  title, lang, lead, intro, role, scope, timeline,
  "hero": { "video": hero.video.asset->url, "poster": hero.poster${pic}, "alt": hero.alt, "caption": hero.caption },
  "sections": sections[]{ _key, name, heading, body, note,
    "figure": figure{ "src": asset->url, alt, caption, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height } }
}`);
export const CASE_SLUGS_QUERY = defineQuery(`*[_type == "project" && hasCase == true && defined(slug.current)].slug.current`);

export const ABOUT_QUERY = defineQuery(`*[_id == "about"][0]{
  hello, lead,
  "photos": photos[]{ "src": @${pic}, alt },
  facts[]{ label, value, sub },
  experience[]{ when, place, role },
  stickers[]{ text, tone, size }
}`);

export const PLAYGROUND_QUERY = defineQuery(`*[_type == "playgroundPiece" && defined(image.asset)] | order(orderRank){
  title, "src": image.asset->url, "video": video.asset->url,
  "w": image.asset->metadata.dimensions.width, "h": image.asset->metadata.dimensions.height
}`);
