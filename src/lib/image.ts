// Responsive images without next/image: the browser picks a width from a
// srcset, and the resizing is done by a CDN that already sits in front of
// the file. Sanity images resize on cdn.sanity.io (?w=). Files in /public
// resize on Next's own optimizer (/_next/image), which Vercel runs at the
// edge and `next start` runs locally. Its widths must be listed in
// next.config's images sizes, or it refuses them.

const WIDTHS = [160, 320, 480, 640, 960, 1280, 1600, 2000];

/** One resized copy of a picture, or undefined when nothing can resize it. */
export function resized(src: string, w: number): string | undefined {
  if (src.startsWith("https://cdn.sanity.io/")) {
    const u = new URL(src);
    // A picture cut to its frame (content/get.ts asks w + h) keeps its shape:
    // the height scales with the width, or a narrow copy comes back as a
    // tall slice of the photo.
    const w0 = Number(u.searchParams.get("w"));
    const h0 = Number(u.searchParams.get("h"));
    if (w0 && h0) u.searchParams.set("h", String(Math.round((h0 * w) / w0)));
    u.searchParams.set("w", String(w));
    u.searchParams.set("auto", "format");
    return u.toString();
  }
  if (src.startsWith("/") && !src.endsWith(".svg")) {
    return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
  }
  return undefined;
}

/** A srcset for a picture, or undefined when nothing can resize it. */
export function srcSet(src: string | undefined): string | undefined {
  if (!src) return undefined;
  const set = WIDTHS.map((w) => [resized(src, w), w] as const).filter(([u]) => u);
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
  // A case's sections take two thirds of the content (max 1600) less the insets.
  figure: "(width < 900px) 100vw, min(986px, calc(66.7vw - 208px))",
  figureHalf: "(width < 600px) 100vw, (width < 900px) 50vw, min(483px, calc(33.3vw - 114px))",
  figureThird: "(width < 600px) 100vw, (width < 900px) 33vw, min(315px, calc(22.2vw - 81px))",
  post: "(width < 900px) 170px, 300px",
} as const;
