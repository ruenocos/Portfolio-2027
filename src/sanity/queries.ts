import { defineQuery } from "next-sanity";

// Pictures come as the image itself (asset, crop, hotspot), so the site can
// honour the crop and focal point set in the Studio.
const pic = `{ asset, crop, hotspot }`;
// A loop's lighter copies (scripts/video-copies.mjs), only while they were
// made from the file that's there now.
const copy = (video: string, kind: string) =>
  `select(${video}Copies.from == ${video}.asset._ref => ${video}Copies.${kind}.asset->url)`;

const projectRow = `{
  title, lang, summary, timeline, role, tools, note, label, hasCase,
  "slug": slug.current,
  "poster": poster${pic},
  "video": video.asset->url,
  "videoAv1": ${copy("video", "av1")},
  "peek": ${copy("video", "small")},
  "peekAv1": ${copy("video", "smallAv1")}
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

// Work: every project, in the Studio's drag order.
export const WORK_QUERY = defineQuery(`*[_type == "project"] | order(orderRank) ${projectRow}`);

export const CASE_QUERY = defineQuery(`*[_type == "project" && hasCase == true && slug.current == $slug][0]{
  title, lang, lead, intro, role, scope, timeline,
  "hero": { "video": hero.video.asset->url, "videoAv1": ${copy("hero.video", "av1")}, "poster": hero.poster${pic}, "alt": hero.alt, "caption": hero.caption },
  "sections": sections[]{ _key, name, heading, body, note,
    "figure": figure{ "src": asset->url, alt, caption, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height } }
}`);
// Every project has a page (the short one until its case is written).
export const CASE_SLUGS_QUERY = defineQuery(`*[_type == "project" && defined(slug.current)].slug.current`);

export const ABOUT_QUERY = defineQuery(`*[_id == "about"][0]{
  hello, lead,
  "photos": photos[]{ "src": @${pic}, alt },
  facts[]{ label, value, sub },
  experience[]{ when, place, role },
  stickers[]{ text, tone, size }
}`);

export const PLAYGROUND_QUERY = defineQuery(`*[_type == "playgroundPiece" && defined(image.asset)] | order(orderRank){
  title, "src": image.asset->url, "video": video.asset->url, "videoAv1": ${copy("video", "av1")},
  "w": image.asset->metadata.dimensions.width, "h": image.asset->metadata.dimensions.height
}`);
