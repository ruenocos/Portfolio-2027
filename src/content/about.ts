import type { Fact } from "@/components/parts/Facts";
import type { Photo } from "./home";

export type Job = { when: string; place: string; role: string };
export type Sticker = { text: string; tone: "tang" | "grape" | "ink" | "outline"; size?: "s" | "m" | "l" };
export type AboutContent = {
  hello: string;
  lead: string;
  photos: Photo[];
  facts: Fact[];
  experience: Job[];
  stickers: Sticker[];
};

// All of it is Wons's own: facts and dates from his LinkedIn.
export const FALLBACK_ABOUT: AboutContent = {
  hello: "Hi, I’m Wessel.",
  lead: "I studied design at Mediacollege and learned motion from a lot of YouTube. These days I do both at WP Masters.",
  photos: [
    // Wons's own photos, not the Home deck's: no image appears on two pages.
    // Alt text describes, it doesn't caption.
    { src: "/media/about-cat-bed.jpg", alt: "Wessel on the bed, a ginger cat beside him" },
    { src: "/media/about-cat-cushion.jpg", alt: "A ginger cat on the sofa with a crocheted coaster on its head" },
    { src: "/media/about-cat-paw.jpg", alt: "A ginger cat stretching one paw out on a striped blanket" },
  ],
  facts: [
    { label: "Now", value: "UX/UI & Motion Designer", sub: "WP Masters, since Jul 2024" },
    { label: "Studied", value: "E-commerce Design, cum laude", sub: "Mediacollege Amsterdam, 2020–2024" },
    { label: "Looking for", value: "A medior UI/UX role", sub: "Where I get to animate too" },
  ],
  experience: [
    { when: "Jul 2024 – now", place: "WP Masters", role: "UX/UI & Motion Designer" },
    { when: "Apr 2023 – now", place: "De Saak", role: "Designer and developer" },
    { when: "Feb 2023 – Feb 2024", place: "WP Masters", role: "Two UX/UI internships" },
    { when: "Jul 2020 – Jun 2023", place: "CAD & Company", role: "UX Designer, then marketing graphic design" },
    { when: "Jan 2020 – Jul 2024", place: "Mediacollege Amsterdam", role: "E-commerce Design, cum laude" },
    { when: "2017 – 2020", place: "ROC Horizon College", role: "Applicatie & Media ontwikkeling" },
  ],
  stickers: [
    // Three sizes: the big themes large, the single games small. Codenames,
    // Ticket to Ride and Exploding Kittens are suggestions Wons asked for.
    { text: "Sports", tone: "tang", size: "l" },
    { text: "Board games", tone: "grape", size: "l" },
    { text: "Friends", tone: "ink", size: "l" },
    { text: "A bit of gaming", tone: "outline" },
    { text: "Learning new things", tone: "tang" },
    { text: "Catan", tone: "grape", size: "s" },
    { text: "Flip 7", tone: "tang", size: "s" },
    { text: "Dalmuti", tone: "outline", size: "s" },
    { text: "Monopoly", tone: "ink", size: "s" },
    { text: "Codenames", tone: "outline", size: "s" },
    { text: "Ticket to Ride", tone: "grape", size: "s" },
    { text: "Exploding Kittens", tone: "tang", size: "s" },
    { text: "Gym", tone: "tang" },
    { text: "Tinkering", tone: "grape" },
    { text: "YouTube", tone: "outline" },
  ],
};
