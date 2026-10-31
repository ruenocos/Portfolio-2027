import { defineField, defineType } from "sanity";

// Lighter copies of a loop, made by scripts/video-copies.mjs (run it after
// uploading a loop) and never
// filled by hand: AV1 for the browsers that play it, and a small copy for
// where the loop shows small (Work's thumbnails, Playground tiles, a case
// header on phones). `from` names the upload they were made from; when the loop is
// replaced the site ignores them until the script has made new ones.
export const videoCopies = defineType({
  name: "videoCopies",
  title: "Video copies",
  type: "object",
  readOnly: true,
  fields: [
    defineField({ name: "from", type: "string" }),
    defineField({ name: "av1", type: "file" }),
    defineField({ name: "small", type: "file" }),
    defineField({ name: "smallAv1", type: "file" }),
  ],
});

/** The hidden field each video sits next to. */
export const copiesField = defineField({ name: "videoCopies", type: "videoCopies", hidden: true });
