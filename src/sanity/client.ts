import { createClient } from "next-sanity";
import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import { apiVersion, dataset, projectId } from "./env";

const CLEAN = new Set(["lang", "tools", "tone", "size", "key", "label", "alt"]);

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  // Click-to-edit marks, only added in draft mode. Fields the code reads or
  // compares (enums, keys, tool ids) or puts in attributes (alt, aria
  // labels) stay clean, so the site behaves the same while editing.
  stega: {
    studioUrl: "/studio",
    filter: (props) => (props.sourcePath.some((seg) => CLEAN.has(seg as string)) ? false : props.filterDefault(props)),
  },
});

const builder = createImageUrlBuilder({ projectId, dataset });

export function urlFor(source: SanityImageSource) {
  return builder.image(source).auto("format");
}
