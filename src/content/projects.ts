import type { Project } from "@/components/parts/ProjectRow";
import { FALLBACK_CASES } from "./cases";

// The home's three rows in code. A project shows only once it has a case;
// small projects go on the Playground instead.
// Summaries, roles and pin notes are its placeholder copy; the video per
// row is a guess until the real media is in Sanity.
export const FALLBACK_FEATURED: Project[] = [
  {
    title: "De Saak",
    summary:
      "Visitors reached the old site but rarely found what they came for. Services were buried, articles were hard to reach, and search engines barely noticed it. The new site puts the answer first, and gets found.",
    timeline: "2023–now",
    role: "Designer and developer",
    tools: ["figma", "illustrator", "claude"],
    media: { poster: "/media/pixelup-portrait.jpg", video: "/media/pixelup-portrait.mp4" },
    href: "/work/de-saak",
    label: "De Saak case study. Design, dev and SEO, 2023 to now.",
    note: { text: "The menu took longest.", spot: { fx: 0.72, dy: 30, rot: -3 } },
    mock: ["summary", "role", "note", "media"],
  },
  {
    title: "UI motion study",
    summary:
      "Users tapped through the interface without knowing what had changed. A panel opened, a list updated, a state flipped, and nothing told them where to look. Now each moment moves just enough to explain itself.",
    timeline: "2026",
    role: "Motion designer",
    tools: ["figma", "after-effects", "lottiefiles"],
    media: { poster: "/media/supabase-portrait.jpg", video: "/media/supabase-portrait.mp4" },
    href: "/work/ui-motion-study",
    label: "UI motion study. Self-initiated, 2026.",
    note: { text: "Every ease is hand-tuned.", spot: { fx: 0.38, dy: 36, rot: 2.5 } },
    mock: ["summary", "role", "note"],
  },
  {
    title: "Designer tool",
    summary:
      "Designers could finish the work but lost time on the handoff: exporting assets, renaming layers and writing specs by hand, every time. The tool does that part, so the time goes back to design.",
    timeline: "2026",
    role: "Designer and maker",
    tools: ["figma", "claude"],
    media: { poster: "/media/calcom-portrait.jpg", video: "/media/calcom-portrait.mp4" },
    href: "/work/designer-tool",
    label: "Designer tool. Self-initiated, 2026.",
    note: { text: "Named every layer. Once.", spot: { fx: 0.6, dy: 28, rot: -1.5 } },
    mock: ["summary", "role", "note"],
  },
];

// Without Sanity, only the rows whose case is in code show.
export const FALLBACK_PROJECTS = FALLBACK_FEATURED.filter((p) => FALLBACK_CASES.some((c) => p.href === `/work/${c.slug}`));
