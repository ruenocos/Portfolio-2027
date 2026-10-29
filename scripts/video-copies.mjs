// Makes the lighter copies of every loop in Sanity and stores them next to it
// (the hidden `videoCopies` field, schemaTypes/videoCopies.ts):
//   av1       the same loop in AV1, for browsers that play it (~30–45% lighter)
//   small     a 360px-wide H.264 copy of a project's portrait loop, for Work's thumbnails
//   smallAv1  the same in AV1
// Only loops whose copies are missing or were made from an older upload are
// done, so it's safe to run again (and nightly, .github/workflows/video-copies.yml).
// A copy that comes out barely lighter than its source isn't kept.
//
//   SANITY_API_WRITE_TOKEN=… node scripts/video-copies.mjs [--dry]
// Needs ffmpeg with libsvtav1 and libx264.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "u0p6z6ze";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_WRITE_TOKEN;
const DRY = process.argv.includes("--dry");
if (!TOKEN) throw new Error("SANITY_API_WRITE_TOKEN is not set");

const api = (path) => `https://${PROJECT}.api.sanity.io/v2026-10-01${path}`;
const auth = { Authorization: `Bearer ${TOKEN}` };
const KEEP_BELOW = 0.9; // a copy must be at least 10% lighter than its source

const ENCODE = {
  av1: ["-c:v", "libsvtav1", "-preset", "5", "-crf", "34"],
  small: ["-vf", "scale=360:-2", "-c:v", "libx264", "-preset", "veryslow", "-crf", "26", "-profile:v", "high"],
  smallAv1: ["-vf", "scale=360:-2", "-c:v", "libsvtav1", "-preset", "5", "-crf", "36"],
};

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
    (d) => ({ ...d, field: "videoCopies", kinds: ["av1", "small", "smallAv1"] }),
  ),
  ...(await query(`*[_type == "project" && defined(hero.video.asset)]{ _id, "ref": hero.video.asset._ref, "url": hero.video.asset->url, "made": hero.videoCopies.from }`)).map(
    (d) => ({ ...d, field: "hero.videoCopies", kinds: ["av1"] }),
  ),
  ...(await query(`*[_type == "playgroundPiece" && defined(video.asset)]{ _id, "ref": video.asset._ref, "url": video.asset->url, "made": videoCopies.from }`)).map(
    (d) => ({ ...d, field: "videoCopies", kinds: ["av1"] }),
  ),
].filter((l) => l.made !== l.ref);

console.log(loops.length ? `${loops.length} loop(s) need copies` : "Every loop has its copies.");
const dir = mkdtempSync(join(tmpdir(), "video-copies-"));
const uploaded = new Map(); // one set of copies per source file, even when two documents share it

for (const loop of loops) {
  let copies = uploaded.get(loop.ref);
  if (!copies) {
    const src = join(dir, `${loop.ref}.mp4`);
    writeFileSync(src, Buffer.from(await (await fetch(loop.url)).arrayBuffer()));
    const srcSize = statSync(src).size;
    copies = { _type: "videoCopies", from: loop.ref };
    const sizes = {};
    for (const kind of loop.kinds) {
      const out = join(dir, `${loop.ref}-${kind}.mp4`);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, ...ENCODE[kind], "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", out], { stdio: "pipe" });
      const size = statSync(out).size;
      // Each copy is measured against what it stands in for: the AV1 small
      // copy against the H.264 small one, the rest against the upload.
      const against = kind === "smallAv1" ? sizes.small : srcSize;
      sizes[kind] = size;
      const kept = !!against && size < against * KEEP_BELOW;
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
    uploaded.set(loop.ref, copies);
  }
  if (DRY) continue;
  const res = await fetch(api(`/data/mutate/${DATASET}`), {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ mutations: [{ patch: { id: loop._id, set: { [loop.field]: copies } } }] }),
  });
  if (!res.ok) throw new Error(`patch ${res.status}: ${await res.text()}`);
  console.log(`  ${loop._id} ${loop.field} saved`);
}
