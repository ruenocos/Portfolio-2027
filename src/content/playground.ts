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

// How many posts the board wants before one repeats: about two screens.
export const PLAYGROUND_TARGET = 24;

const M = "/media";
const P = `${M}/play`;

// Playground v08 (studio/web/hifi/playground, approved): a big looping
// masonry. The game reel and five Study renders are real; the rest are prompts until
// Wons adds his experiments in Sanity (Playground posts). Nothing here repeats
// an image from another page (Wons, 2026-10-28).
export const FALLBACK_POSTS: Post[] = [
  { title: "Match Monsters and Hold’em, game screens", video: `${M}/game-reel.mp4`, src: `${M}/game-reel.jpg`, ar: 720 / 1548 },
  // From Wons's Study folder (After Effects renders, 2026-10-27). Titles are
  // working names from the file names until Wons names them.
  { title: "Glass orbs, lit from every side", video: `${P}/glass-orbs.mp4`, src: `${P}/glass-orbs.jpg`, ar: 16 / 9 },
  { title: "Spade to heart in one shape", video: `${P}/suit-morph.mp4`, src: `${P}/suit-morph.jpg`, ar: 1 },
  { title: "A loader worth waiting for", video: `${P}/shape-loader.mp4`, src: `${P}/shape-loader.jpg`, ar: 1 },
  { title: "Letters, timed", video: `${P}/text-anim.mp4`, src: `${P}/text-anim.jpg`, ar: 16 / 9 },
  { title: "Gravity, roughly", video: `${P}/shape-fall.mp4`, src: `${P}/shape-fall.jpg`, ar: 1 },
  // Placeholders, 18 of them: with the six above that's 24, about two
  // screens of the board before a post repeats. Each title is a prompt for
  // the kind of piece that fits there (picture or loop), across the three
  // Focus tracks plus some play. Replace them in Sanity, in any order.
  // Motion (loops)
  { title: "Loop idea: a button, toggle or like with a satisfying press, 3–6s", ar: 16 / 10, tint: "tang", mock: true },
  { title: "Loop idea: a logo sting, the mark drawing itself on in about 4s", ar: 16 / 9, tint: "grape", mock: true },
  { title: "Loop idea: a set of 4–6 Lottie icons, each with its hover state", ar: 1, tint: "plain", mock: true },
  { title: "Loop idea: one word that moves the way it means", ar: 16 / 9, tint: "tang", mock: true },
  { title: "Loop idea: a loading or empty state you'd actually want to look at", ar: 1, tint: "grape", mock: true },
  { title: "Loop idea: a page transition, prototyped in Figma or After Effects", ar: 16 / 10, tint: "plain", mock: true },
  { title: "Loop idea: one move, three easing curves side by side", ar: 16 / 9, tint: "tang", mock: true },
  { title: "Loop idea: a phone flow, recorded tap by tap", ar: 9 / 16, tint: "grape", mock: true },
  // UX/UI (pictures)
  { title: "Picture idea: one component in every state, laid out like a spec", ar: 4 / 3, tint: "plain", mock: true },
  { title: "Picture idea: a screen from an app you use daily, redesigned, before and after", ar: 4 / 3, tint: "tang", mock: true },
  { title: "Picture idea: one dashboard card that makes a number easy to read", ar: 16 / 10, tint: "grape", mock: true },
  { title: "Picture idea: an icon set on its grid", ar: 1, tint: "plain", mock: true },
  { title: "Picture idea: one palette, used five ways", ar: 1, tint: "tang", mock: true },
  { title: "Picture idea: a poster or type layout from Illustrator", ar: 3 / 4, tint: "grape", mock: true },
  // AI / automation
  { title: "Picture idea: a Figma plugin or script you wrote, caught working", ar: 16 / 10, tint: "plain", mock: true },
  { title: "Loop idea: a boring job before and after a Claude workflow", ar: 16 / 9, tint: "tang", mock: true },
  // Play
  { title: "Picture idea: a sketchbook page, scanned as it is", ar: 3 / 4, tint: "grape", mock: true },
  { title: "Picture idea: a card or box design for a board game", ar: 3 / 4, tint: "plain", mock: true },
];
