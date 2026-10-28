/**
 * Give every project complete placeholder content in Sanity, so each field
 * is already there to edit. Lorem ipsum only, never invented facts: the
 * site keeps lorem marked as mock (shown with ?mocks).
 *
 *   SANITY_API_WRITE_TOKEN=… npx jiti scripts/fill-placeholders.ts
 *   npx jiti scripts/fill-placeholders.ts --dry
 *
 * Fills only what's empty, on the draft, so nothing written is overwritten
 * and nothing goes live until the projects are published (all together).
 */
import { createReadStream, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { createClient } from "@sanity/client";

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
  perspective: "raw",
});

const L = {
  line: "Lorem ipsum dolor sit amet, consectetur adipiscing.",
  short: "Lorem ipsum dolor sit amet.",
  two: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  three:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
};

// The case read's layers, in the order De Saak uses (minus its SEO layer).
const SECTIONS = ["Context", "Problem", "Approach", "Design", "Build", "Result", "Takeaway"].map((name) => ({
  _key: name.toLowerCase(),
  _type: "caseSection",
  name,
  heading: "Lorem ipsum dolor sit amet",
  body: name === "Takeaway" ? L.short : L.body,
}));

const PUBLIC = join(process.cwd(), "public");
const uploaded = new Map<string, string>();
async function image(src: string) {
  const path = join(PUBLIC, src);
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  let id = uploaded.get(path);
  if (!id) {
    id = dry ? `dry-${basename(path)}` : (await client.assets.upload("image", createReadStream(path), { filename: basename(path) }))._id;
    uploaded.set(path, id);
  }
  return { _type: "image", asset: { _type: "reference", _ref: id } };
}

const TILE: Record<string, string> = { orka: "/media/archive-tile1.jpg", waggle: "/media/archive-tile2.jpg", aniplanner: "/media/archive-tile3.jpg" };

type Doc = Record<string, unknown> & { _id: string; _type: string; title: string; slug?: { current?: string }; hero?: Record<string, unknown> };
const empty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

async function projects() {
  const docs = await client.fetch<Doc[]>(`*[_type == "project"]`);
  // One per project: the draft if there is one (drafts are what gets edited).
  const byId = new Map<string, Doc>();
  for (const d of docs) {
    const id = d._id.replace(/^drafts\./, "");
    if (d._id.startsWith("drafts.") || !byId.has(id)) byId.set(id, d);
  }
  for (const d of byId.values()) {
    const slug = d.slug?.current ?? "";
    const want: Record<string, unknown> = {
      summary: L.three,
      timeline: "20XX",
      role: "Lorem ipsum",
      tools: ["figma"],
      note: "Lorem ipsum dolor sit.",
      label: `${d.title}. Lorem ipsum, 20XX.`,
      lead: L.line,
      intro: L.two,
      scope: "Lorem, ipsum, dolor",
      sections: SECTIONS,
    };
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(want)) if (empty(d[k])) set[k] = v;
    if (empty(d.poster) && TILE[slug]) set.poster = await image(TILE[slug]);
    const hero = d.hero ?? {};
    if (empty(hero.alt)) set["hero.alt"] = "Lorem ipsum dolor sit amet.";
    if (empty(hero.caption)) set["hero.caption"] = "Lorem ipsum, dolor sit.";
    if (!Object.keys(set).length) {
      console.log(`${d._id}: complete`);
      continue;
    }
    console.log(`${dry ? "would fill" : "fill"} ${d._id}: ${Object.keys(set).join(", ")}`);
    if (dry) continue;
    // Writing to the draft: create it from the published doc first if needed.
    const draftId = d._id.startsWith("drafts.") ? d._id : `drafts.${d._id}`;
    const tx = client.transaction();
    if (draftId !== d._id) tx.createIfNotExists({ ...d, _id: draftId });
    // Sanity runs set before setIfMissing in one patch, so the hero object
    // gets its own patch first.
    await tx.patch(draftId, (p) => p.setIfMissing({ hero: {} })).patch(draftId, (p) => p.set(set)).commit();
  }
}

async function main() {
  console.log(dry ? "Dry run: nothing is written.\n" : "Filling placeholders.\n");
  await projects();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
