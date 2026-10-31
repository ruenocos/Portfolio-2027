import { defineQuery } from "next-sanity";

// Pictures come as the image itself (asset, crop, hotspot), so the site can
// honour the crop and focal point set in the Studio.
const pic = `{ asset, crop, hotspot }`;
// A loop's lighter copies (scripts/video-copies.mjs), only while they were
// made from the file that's there now.
// The helpers keep their exact text as a type (`as const`), so each query
// stays a literal string and finds its generated result type.
const copy = <V extends string, K extends string>(video: V, kind: K) =>
  `select(${video}Copies.from == ${video}.asset._ref => ${video}Copies.${kind}.asset->url)` as const;

// A project shows only once it has a case: a slug and a written section.
// `at` reaches the project through a reference (featured[]).
const caseOf = <A extends string>(at: A) =>
  `defined(${at}slug.current) && count(${at}sections[defined(name) && defined(heading)]) > 0` as const;
const hasCase = caseOf("");

const projectRow = `{
  _createdAt, title, lang, summary, timeline, role, tools, note, label,
  "slug": slug.current,
  "poster": poster${pic},
  "video": video.asset->url,
  videoFocus,
  "videoAv1": ${copy("video", "av1")},
  "peek": ${copy("video", "small")},
  "peekAv1": ${copy("video", "smallAv1")}
}` as const;

export const HOME_QUERY = defineQuery(`{
  "home": *[_type == "home" && _id == "home"][0]{
    basedIn, role,
    "reel": { "loop": reel.loop.asset->url, "full": reel.full.asset->url, "poster": reel.poster.asset->url },
    aboutOpener, aboutNext,
    "photos": photos[]{ "src": @${pic}, alt },
    focusStatement,
    tracks[]{ key, title, line },
    "archive": archive[]{ "src": asset->url, name },
    "featured": featured[${caseOf("@->")}]->${projectRow}
  },
  // For the fallback when nothing is picked: the site takes the newest three.
  "projects": *[_type == "project" && ${hasCase}] | order(orderRank) ${projectRow}
}`);

// Work: every project, in the Studio's drag order.
export const WORK_QUERY = defineQuery(`*[_type == "project" && ${hasCase}] | order(orderRank) ${projectRow}`);

export const CASE_QUERY = defineQuery(`*[_type == "project" && slug.current == $slug][0]{
  title, lang, lead, intro, role, scope, timeline,
  "hero": { "video": hero.video.asset->url, "videoAv1": ${copy("hero.video", "av1")},
    "videoSmall": ${copy("hero.video", "small")}, "videoSmallAv1": ${copy("hero.video", "smallAv1")}, "poster": hero.poster${pic}, "alt": hero.alt, "caption": hero.caption },
  "sections": sections[]{ _key, name, heading, body, note,
    "figure": figure{ "src": asset->url, alt, caption, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height },
    "media": media[]{ _key, _type, layout,
      items[]{ "src": image${pic}, "width": image.asset->metadata.dimensions.width, "height": image.asset->metadata.dimensions.height, "video": video.asset->url, alt },
      "before": before{ "src": asset->url, alt, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height },
      "after": after{ "src": asset->url, alt, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height },
      beforeLabel, afterLabel } }
}`);
export const CASE_SLUGS_QUERY = defineQuery(`*[_type == "project" && ${hasCase}].slug.current`);

export const ABOUT_QUERY = defineQuery(`*[_type == "about" && _id == "about"][0]{
  hello, lead,
  "photos": photos[]{ "src": @${pic}, alt },
  facts[]{ label, value, sub },
  experience[]{ when, place, role },
  stickers[]{ text, tone, size }
}`);

export const PLAYGROUND_QUERY = defineQuery(`*[_type == "playgroundPiece" && defined(image.asset)] | order(orderRank){
  title, "src": image.asset->url, "video": video.asset->url, "videoAv1": ${copy("video", "av1")},
  "tile": ${copy("video", "small")}, "tileAv1": ${copy("video", "smallAv1")},
  "w": image.asset->metadata.dimensions.width, "h": image.asset->metadata.dimensions.height
}`);
