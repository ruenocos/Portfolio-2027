/**
 * Move Projects and Playground posts from the old Order number to drag-to-
 * order ranks, keeping the order the site shows today.
 *
 *   SANITY_API_WRITE_TOKEN=… npx jiti scripts/order-rank.ts          (adds ranks)
 *   SANITY_API_WRITE_TOKEN=… npx jiti scripts/order-rank.ts --unset  (also drops the old Order field)
 *   npx jiti scripts/order-rank.ts --dry                             (prints the plan)
 *
 * Safe to run again: documents that already have a rank keep it.
 */
import { createClient } from "@sanity/client";
import { LexoRank } from "lexorank";

const dry = process.argv.includes("--dry");
const unset = process.argv.includes("--unset");
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

type Doc = { _id: string; _createdAt: string; order?: number; orderRank?: string };

async function rank(type: string) {
  const docs = await client.fetch<Doc[]>(`*[_type == $type]{ _id, _createdAt, order, orderRank }`, { type });
  // A draft and its published version are one item in the list.
  const items = new Map<string, Doc[]>();
  for (const d of docs) {
    const id = d._id.replace(/^drafts\./, "");
    items.set(id, [...(items.get(id) ?? []), d]);
  }
  const sorted = [...items.values()].sort((a, b) => (a[0].order ?? 1e9) - (b[0].order ?? 1e9) || a[0]._createdAt.localeCompare(b[0]._createdAt));

  let r = LexoRank.min();
  const tx = client.transaction();
  for (const versions of sorted) {
    r = r.genNext().genNext();
    const value = versions.find((v) => v.orderRank)?.orderRank ?? r.toString();
    for (const v of versions) {
      console.log(`${type} ${v._id}: order ${v.order ?? "-"} -> ${value}${unset ? ", order removed" : ""}`);
      tx.patch(v._id, (p) => {
        const set = v.orderRank ? p : p.set({ orderRank: value });
        return unset ? set.unset(["order"]) : set;
      });
    }
  }
  if (!dry && sorted.length) await tx.commit();
}

async function main() {
  console.log(dry ? "Dry run: nothing is written.\n" : "Ranking.\n");
  await rank("project");
  await rank("playgroundPiece");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
