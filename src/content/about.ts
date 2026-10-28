import type { Fact } from "@/components/parts/Facts";
import { FALLBACK_HOME, type Photo } from "./home";

export type Job = { when: string; place: string; role: string };
/** One shape per kind of thing: card games are cards, making is a block,
 * moving is a ball, people are pills. The shape sets the fill too. */
export type StickerKind = "card" | "square" | "round" | "pill";
export type Sticker = { text: string; kind: StickerKind };
export type AboutContent = {
  hello: string;
  lead: string;
  photos: Photo[];
  facts: Fact[];
  experience: Job[];
  stickers: Sticker[];
};

// About v07 (studio/web/hifi/about, approved by Wons 2026-10-27). All of
// it is Wons's own: facts and dates from his LinkedIn (wessel-work-history).
export const FALLBACK_ABOUT: AboutContent = {
  hello: "Hi, I’m Wessel.",
  lead: FALLBACK_HOME.about.opener,
  photos: [
    ...FALLBACK_HOME.about.photos,
    // Wons's own photos (2026-10-27). Alt text describes, it doesn't caption.
    { src: "/media/about-cat-bed.jpg", alt: "Wessel on the bed, a ginger cat beside him" },
    { src: "/media/about-cat-cushion.jpg", alt: "A ginger cat on the sofa with a crocheted coaster on its head" },
    { src: "/media/about-cat-paw.jpg", alt: "A ginger cat stretching one paw out on a striped blanket" },
  ],
  facts: [
    { label: "Now", value: "UX/UI & Motion Designer", sub: "WP Masters, since Jul 2024" },
    { label: "Studied", value: "E-commerce Design, cum laude", sub: "Mediacollege Amsterdam, 2020–2024" },
    { label: "Looking for", value: "A medior UI/UX role", sub: "With motion as part of it" },
  ],
  experience: [
    { when: "Jul 2024 – now", place: "WP Masters", role: "UX/UI & Motion Designer" },
    { when: "Apr 2023 – now", place: "De Saak", role: "User Experience Designer" },
    { when: "Feb 2023 – Feb 2024", place: "WP Masters", role: "Two UX/UI internships" },
    { when: "Jul 2020 – Jun 2023", place: "CAD & Company", role: "UX Designer, then marketing graphic design" },
    { when: "Jan 2020 – Jul 2024", place: "Mediacollege Amsterdam", role: "E-commerce Design, cum laude" },
    { when: "2017 – 2020", place: "ROC Horizon College", role: "Applicatie & Media ontwikkeling" },
  ],
  stickers: [
    // Off screen v09 (2026-10-28). Wons's own list, reworded and sorted
    // into four kinds; Codenames, Ticket to Ride and Exploding Kittens are
    // suggestions Wons invited ("add some more board game names").
    { text: "Catan", kind: "card" },
    { text: "Flip 7", kind: "card" },
    { text: "Dalmuti", kind: "card" },
    { text: "Monopoly", kind: "card" },
    { text: "Codenames", kind: "card" },
    { text: "Ticket to Ride", kind: "card" },
    { text: "Exploding Kittens", kind: "card" },
    { text: "Taking things apart", kind: "square" },
    { text: "New things to learn", kind: "square" },
    { text: "One more tutorial", kind: "square" },
    { text: "Sports", kind: "round" },
    { text: "Gym", kind: "round" },
    { text: "MoveEeE", kind: "round" },
    { text: "Friends", kind: "pill" },
    { text: "Game night", kind: "pill" },
    { text: "Video games, a bit", kind: "pill" },
  ],
};
