// Responsive images without next/image: the browser picks a width from a
// srcset, and the resizing is done by a CDN that already sits in front of
// the file. Sanity images resize on cdn.sanity.io (?w=). Files in /public
// resize on Netlify's Image CDN, on Netlify only; elsewhere (local dev)
// they're served as they are.

const WIDTHS = [160, 320, 480, 640, 960, 1280, 1600, 2000];
const NETLIFY = process.env.NEXT_PUBLIC_IMAGE_CDN === "netlify";

function at(src: string, w: number): string | undefined {
  if (src.startsWith("https://cdn.sanity.io/")) {
    const u = new URL(src);
    u.searchParams.set("w", String(w));
    u.searchParams.set("auto", "format");
    return u.toString();
  }
  if (NETLIFY && src.startsWith("/") && !src.endsWith(".svg")) {
    return `/.netlify/images?url=${encodeURIComponent(src)}&w=${w}`;
  }
  return undefined;
}

/** A srcset for a picture, or undefined when nothing can resize it. */
export function srcSet(src: string | undefined): string | undefined {
  if (!src) return undefined;
  const set = WIDTHS.map((w) => [at(src, w), w] as const).filter(([u]) => u);
  return set.length ? set.map(([u, w]) => `${u} ${w}w`).join(", ") : undefined;
}

/** How wide each picture shows, per layout (measured on the built site at
 *  1440 and 390 wide). Below the 900px stack breakpoint the phone layout. */
export const SIZES = {
  reel: "(width < 900px) 82vw, 240px",
  project: "(width < 900px) 72vw, 400px",
  peek: "(width < 900px) 64px, 170px",
  deck: "(width < 900px) 60vw, 360px",
  stack: "(width < 900px) 68vw, 320px",
  archive: "(width < 900px) 140px, 250px",
  wide: "(width < 900px) 100vw, 1200px",
  figure: "(width < 900px) 100vw, 860px",
  post: "(width < 900px) 170px, 300px",
} as const;
