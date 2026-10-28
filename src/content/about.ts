import type { Fact } from "@/components/parts/Facts";
import { FALLBACK_HOME, type Photo } from "./home";

export type Job = { when: string; place: string; role: string };
export type Sticker = { text: string; tone: "tang" | "grape" | "ink" | "outline" };
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
    // Wons's own photos (2026-10-27). Not the Home deck's: no image appears on
    // two pages (Wons, 2026-10-28). Alt text describes, it doesn't caption.
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
    { text: "Sports", tone: "tang" },
    { text: "Board games", tone: "grape" },
    { text: "Friends", tone: "ink" },
    { text: "A bit of gaming", tone: "outline" },
    { text: "Learning new things", tone: "tang" },
    // Added by Wons 2026-10-27 ("more items … react to each other").
    { text: "Catan", tone: "grape" },
    { text: "Flip 7", tone: "tang" },
    { text: "Dalmuti", tone: "outline" },
    { text: "Monopoly", tone: "ink" },
    { text: "Gym", tone: "tang" },
    { text: "Tinkering", tone: "grape" },
    { text: "YouTube", tone: "outline" },
    { text: "MoveEeE", tone: "ink" },
  ],
};
