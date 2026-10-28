/**
 * Fill Sanity with what the site shows today, from src/content.
 *
 *   SANITY_API_WRITE_TOKEN=… npx jiti scripts/seed-sanity.ts          (writes)
 *   npx jiti scripts/seed-sanity.ts --dry                             (prints the plan)
 *
 * Safe to run again: it never overwrites a field that's already filled
 * (setIfMissing), and Sanity keeps one asset per file, so uploads dedupe.
 *
 * What goes live and what doesn't (DESIGN.md §2.8, nothing invented ships):
 * - Home and About: published, real fields only. The reel and the archive
 *   fan stay out, so the site keeps its marked placeholders for those.
 * - Playground: the real posts, published. The mock tiles stay out.
 * - Projects: drafts only. Their copy is mock until Wons writes it, so they
 *   wait in the Studio for him to edit and publish.
 */
import { createReadStream, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { createClient, type SanityDocumentStub } from "@sanity/client";
import { FALLBACK_HOME } from "../src/content/home";
import { FALLBACK_ABOUT } from "../src/content/about";
import { FALLBACK_POSTS } from "../src/content/playground";
import { FALLBACK_PROJECTS } from "../src/content/projects";
import { FALLBACK_CASES } from "../src/content/cases";

const dry = process.argv.includes("--dry");
const token = process.env.SANITY_API_WRITE_TOKEN;
if (!dry && !token) {
  console.error("Needs SANITY_API_WRITE_TOKEN (an Editor token), or --dry.");
  process.exit(1);
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "u0p6z6ze",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2026-10-01",
  token,
  useCdn: false,
});

const PUBLIC = join(process.cwd(), "public");
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

// One upload per file, however often it's used.
const uploaded = new Map<string, string>();
async function asset(kind: "image" | "file", src?: string) {
  if (!src) return undefined;
  const path = join(PUBLIC, src.split("?")[0]);
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  let id = uploaded.get(path);
  if (!id) {
    id = dry ? `dry-${kind}-${basename(path)}` : (await client.assets.upload(kind, createReadStream(path), { filename: basename(path) }))._id;
    uploaded.set(path, id);
    console.log(`  ${kind} ${src}`);
  }
  return { _type: kind, asset: { _type: "reference", _ref: id } };
}
const image = (src?: string) => asset("image", src);
const file = (src?: string) => asset("file", src);

// Create it if it's new, then fill only what's still empty.
async function fill(doc: SanityDocumentStub & { _id: string }) {
  const { _id, _type, ...fields } = doc;
  console.log(`${dry ? "would fill" : "fill"} ${_id} (${Object.keys(fields).join(", ")})`);
  if (dry) return;
  await client.transaction().createIfNotExists({ _id, _type }).patch(_id, (p) => p.setIfMissing(fields)).commit();
}

// An empty draft (Studio's "New Home") would hide the published doc in the
// Studio, so it goes. A draft with anything in it stays.
async function dropEmptyDraft(id: string) {
  const d = await client.getDocument(`drafts.${id}`);
  if (!d) return;
  const own = Object.keys(d).filter((k) => !k.startsWith("_"));
  if (own.length) return console.log(`  kept drafts.${id}: it has ${own.join(", ")}`);
  console.log(`  ${dry ? "would drop" : "drop"} empty drafts.${id}`);
  if (!dry) await client.delete(`drafts.${id}`);
}

async function home() {
  const h = FALLBACK_HOME;
  await dropEmptyDraft("home");
  await fill({
    _id: "home",
    _type: "home",
    basedIn: h.hero.basedIn,
    role: [...h.hero.role],
    // reel: Wons sends the real one. archive: mostly placeholder tiles.
    aboutOpener: h.about.opener,
    aboutNext: h.about.next,
    photos: await Promise.all(h.about.photos.map(async (p) => ({ _key: key(p.src), ...(await image(p.src))!, alt: p.alt }))),
    focusStatement: h.focus.statement,
    tracks: h.focus.tracks.map((t) => ({ _key: t.key, key: t.key, title: t.title, line: t.line })),
  });
}

async function about() {
  const a = FALLBACK_ABOUT;
  await dropEmptyDraft("about");
  await fill({
    _id: "about",
    _type: "about",
    hello: a.hello,
    lead: a.lead,
    photos: await Promise.all(a.photos.map(async (p) => ({ _key: key(p.src), ...(await image(p.src))!, alt: p.alt }))),
    facts: a.facts.map((f) => ({ _key: key(f.label), label: f.label, value: f.value, sub: f.sub })),
    experience: a.experience.map((j) => ({ _key: key(`${j.place}-${j.when}`), when: j.when, place: j.place, role: j.role })),
    stickers: a.stickers.map((s) => ({ _key: key(s.text), _type: "sticker", text: s.text, tone: s.tone })),
  });
}

async function playground() {
  const real = FALLBACK_POSTS.filter((p) => !p.mock && p.src);
  for (const [i, p] of real.entries()) {
    await fill({
      _id: `play-${key(p.title)}`,
      _type: "playgroundPiece",
      title: p.title,
      image: await image(p.src),
      ...(p.video ? { video: await file(p.video) } : {}),
      order: (i + 1) * 10,
    });
  }
}

async function projects() {
  for (const [i, p] of FALLBACK_PROJECTS.entries()) {
    const slug = p.href?.split("/").pop() ?? key(p.title);
    const c = FALLBACK_CASES.find((x) => x.slug === slug);
    const fact = (label: string) => c?.facts.find((f) => f.label === label)?.value;
    await fill({
      _id: `drafts.project-${slug}`,
      _type: "project",
      title: p.title,
      slug: { _type: "slug", current: slug },
      lang: p.lang ?? "en",
      summary: p.summary,
      timeline: p.timeline,
      role: p.role,
      tools: p.tools.map(String),
      note: p.note?.text,
      label: p.label,
      hasCase: !!c,
      featured: true,
      order: (i + 1) * 10,
      poster: await image(p.media.poster),
      ...(p.media.video ? { video: await file(p.media.video) } : {}),
      ...(c && {
        lead: c.lead,
        intro: c.intro,
        scope: fact("Scope"),
        hero: {
          video: await file(c.hero.video),
          poster: await image(c.hero.poster),
          alt: c.hero.alt,
          caption: c.hero.caption,
        },
        sections: await Promise.all(
          c.sections.map(async (s) => ({
            _key: s.key,
            name: s.name,
            heading: s.heading,
            body: s.body,
            ...(s.note ? { note: s.note } : {}),
            ...(s.figure ? { figure: { ...(await image(s.figure.src))!, alt: s.figure.alt, caption: s.figure.caption } } : {}),
          })),
        ),
      }),
    });
  }
}

async function main() {
  console.log(dry ? "Dry run: nothing is written.\n" : "Seeding Sanity.\n");
  await home();
  await about();
  await playground();
  await projects();
  console.log("\nDone. Projects are drafts: open them in the Studio to edit and publish.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
