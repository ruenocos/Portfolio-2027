export type Post = {
  /** What it shows, for screen readers and the open view. */
  title: string;
  /** Still image, or the poster of a loop. */
  src?: string;
  video?: string;
  /** Width / height. */
  ar: number;
  /** Placeholder (no real experiment yet): a tinted card with a mock tag. */
  tint?: "tang" | "grape" | "plain";
  mock?: boolean;
};

const M = "/media";
const P = `${M}/play`;

// Playground v08 (studio/web/hifi/playground, approved): a big looping
// masonry. The De Saak loop, the game reel and five Study renders are real; the rest are placeholders until
// Wons adds his experiments in Sanity (Playground posts).
export const FALLBACK_POSTS: Post[] = [
  { title: "De Saak header loop", video: `${M}/de-saak/desaak-hero.mp4`, src: `${M}/de-saak/desaak-hero.jpg`, ar: 16 / 9 },
  { title: "Match Monsters and Hold’em, game screens", video: `${M}/game-reel.mp4`, src: `${M}/game-reel.jpg`, ar: 720 / 1548 },
  // From Wons's Study folder (After Effects renders, 2026-10-27). Titles are
  // working names from the file names until Wons names them.
  { title: "Glass orbs, lit from every side", video: `${P}/glass-orbs.mp4`, src: `${P}/glass-orbs.jpg`, ar: 16 / 9 },
  { title: "Spade to heart in one shape", video: `${P}/suit-morph.mp4`, src: `${P}/suit-morph.jpg`, ar: 1 },
  { title: "A loader worth waiting for", video: `${P}/shape-loader.mp4`, src: `${P}/shape-loader.jpg`, ar: 1 },
  { title: "Letters, timed", video: `${P}/text-anim.mp4`, src: `${P}/text-anim.jpg`, ar: 16 / 9 },
  { title: "Gravity, roughly", video: `${P}/shape-fall.mp4`, src: `${P}/shape-fall.jpg`, ar: 1 },
  { title: "PNG post", ar: 1, tint: "tang", mock: true },
  { title: "Cal.com loop", video: `${M}/calcom-portrait.mp4`, src: `${M}/calcom-portrait.jpg`, ar: 9 / 16, mock: true },
  { title: "Video post", ar: 16 / 10, tint: "grape", mock: true },
  { title: "Pixelup loop", video: `${M}/pixelup-portrait.mp4`, src: `${M}/pixelup-portrait.jpg`, ar: 9 / 16, mock: true },
  { title: "PNG post", ar: 4 / 3, tint: "plain", mock: true },
  { title: "Video post", ar: 3 / 4, tint: "tang", mock: true },
  { title: "PNG post", ar: 1, tint: "grape", mock: true },
  { title: "Video post", ar: 16 / 9, tint: "plain", mock: true },
  { title: "PNG post", ar: 3 / 4, tint: "grape", mock: true },
];
