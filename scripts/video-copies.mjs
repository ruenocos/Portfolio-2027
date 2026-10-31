// Makes the lighter copies of every loop in Sanity and stores them next to it
// (the hidden `videoCopies` field, schemaTypes/videoCopies.ts):
//   av1       the same loop in AV1, for browsers that play it (~30–45% lighter)
//   small     an H.264 copy at the size the loop shows small: 360px wide for
//             Work's thumbnails, 660px wide for Playground tiles, and a 720px
//             centre square for a case header on phones (where it squares up)
//   smallAv1  the same in AV1
// Only loops whose copies are missing or were made from an older upload are
// done, so it's safe to run again after uploading or replacing a loop.
// A copy that comes out barely lighter than its source isn't kept.
//
//   SANITY_API_WRITE_TOKEN=… node scripts/video-copies.mjs [--dry] [--again=hero,tile]
// Needs ffmpeg with libsvtav1 and libx264.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "u0p6z6ze";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_WRITE_TOKEN;
const DRY = process.argv.includes("--dry");
// --again=hero,tile remakes those groups' copies, for when what a copy
// should be has changed (groups: thumb, hero, tile).
const AGAIN = (process.argv.find((a) => a.startsWith("--again="))?.slice(8) ?? "").split(",");
if (!TOKEN) throw new Error("SANITY_API_WRITE_TOKEN is not set");

const api = (path) => `https://${PROJECT}.api.sanity.io/v2026-10-01${path}`;
const auth = { Authorization: `Bearer ${TOKEN}` };
const KEEP_BELOW = 0.9; // a copy must be at least 10% lighter than its source

// The small copy's frame, per kind of loop. Never larger than the upload.
const SMALL = {
  thumb: "scale='min(360,iw)':-2",
  tile: "scale='min(660,iw)':-2",
  square: "crop='min(iw,ih)':'min(iw,ih)',scale='min(720,ih)':-2",
};
const encode = (kind, small) =>
  ({
    av1: ["-c:v", "libsvtav1", "-preset", "5", "-crf", "34"],
    small: ["-vf", small, "-c:v", "libx264", "-preset", "veryslow", "-crf", "26", "-profile:v", "high"],
    smallAv1: ["-vf", small, "-c:v", "libsvtav1", "-preset", "5", "-crf", "36"],
  })[kind];

async function query(groq) {
  const url = new URL(api(`/data/query/${DATASET}`));
  url.searchParams.set("query", groq);
  url.searchParams.set("perspective", "raw"); // drafts too, so publishing one keeps its copies
  const res = await fetch(url, { headers: auth });
  if (!res.ok) throw new Error(`query ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}

// Every loop: which document, where its video sits, which copies it gets.
const loops = [
  ...(await query(`*[_type == "project" && defined(video.asset)]{ _id, "ref": video.asset._ref, "url": video.asset->url, "made": videoCopies.from }`)).map(
    (d) => ({ ...d, field: "videoCopies", kinds: ["av1", "small", "smallAv1"], small: SMALL.thumb, group: "thumb" }),
  ),
  ...(await query(`*[_type == "project" && defined(hero.video.asset)]{ _id, "ref": hero.video.asset._ref, "url": hero.video.asset->url, "made": hero.videoCopies.from }`)).map(
    (d) => ({ ...d, field: "hero.videoCopies", kinds: ["av1", "small", "smallAv1"], small: SMALL.square, group: "hero" }),
  ),
  ...(await query(`*[_type == "playgroundPiece" && defined(video.asset)]{ _id, "ref": video.asset._ref, "url": video.asset->url, "made": videoCopies.from }`)).map(
    (d) => ({ ...d, field: "videoCopies", kinds: ["av1", "small", "smallAv1"], small: SMALL.tile, group: "tile" }),
  ),
]
  .filter((l) => l.made !== l.ref || AGAIN.includes(l.group))
  // Copies still made from the current upload keep their AV1: only the
  // small ones are remade.
  .map((l) => (l.made === l.ref ? { ...l, kinds: ["small", "smallAv1"], partial: true } : l));

console.log(loops.length ? `${loops.length} loop(s) need copies` : "Every loop has its copies.");
const patchOf = (loop, copies) =>
  loop.partial
    ? Object.fromEntries(loop.kinds.filter((k) => copies[k]).map((k) => [`${loop.field}.${k}`, copies[k]]))
    : { [loop.field]: copies };
const dir = mkdtempSync(join(tmpdir(), "video-copies-"));
const uploaded = new Map(); // one set of copies per source file, even when two documents share it

for (const loop of loops) {
  const key = `${loop.group}:${loop.ref}`;
  let copies = uploaded.get(key);
  if (!copies) {
    const src = join(dir, `${loop.ref}.mp4`);
    const download = await fetch(loop.url);
    if (!download.ok) throw new Error(`download ${loop.url}: ${download.status}`);
    writeFileSync(src, Buffer.from(await download.arrayBuffer()));
    const srcSize = statSync(src).size;
    copies = { _type: "videoCopies", from: loop.ref };
    const sizes = {};
    for (const kind of loop.kinds) {
      const out = join(dir, `${loop.ref}-${kind}.mp4`);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, ...encode(kind, loop.small), "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", out], { stdio: "pipe" });
      const size = statSync(out).size;
      // Each copy is measured against what it stands in for: the AV1 small
      // copy against the H.264 small one (none without it: the site only
      // plays it in place of that one), the rest against the upload.
      const against = kind === "smallAv1" ? sizes.small : srcSize;
      const kept = !!against && size < against * KEEP_BELOW;
      if (kept) sizes[kind] = size;
      console.log(`  ${loop._id} ${kind}: ${Math.round(srcSize / 1024)} -> ${Math.round(size / 1024)} KB${kept ? "" : " (not kept)"}`);
      if (!kept || DRY) continue;
      const res = await fetch(api(`/assets/files/${DATASET}?filename=${encodeURIComponent(`${loop.ref}-${kind}.mp4`)}`), {
        method: "POST",
        headers: { ...auth, "Content-Type": "video/mp4" },
        body: readFileSync(out),
      });
      if (!res.ok) throw new Error(`upload ${res.status}: ${await res.text()}`);
      copies[kind] = { _type: "file", asset: { _type: "reference", _ref: (await res.json()).document._id } };
    }
    uploaded.set(key, copies);
  }
  if (DRY) continue;
  const res = await fetch(api(`/data/mutate/${DATASET}`), {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ mutations: [{ patch: { id: loop._id, set: patchOf(loop, copies) } }] }),
  });
  if (!res.ok) throw new Error(`patch ${res.status}: ${await res.text()}`);
  console.log(`  ${loop._id} ${loop.field} saved`);
}
