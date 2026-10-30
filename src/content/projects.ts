import type { Project } from "@/components/parts/ProjectRow";

// The home's three rows until Sanity has projects. A row links only once
// its case exists; small projects go on the Playground instead.
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

// Three more projects whose stories aren't written yet: Wessel's own side
// projects. Only the titles are real; year, role and tools show as slots
// (hidden on the live site) and the poster is a placeholder tile.
const TO_WRITE: [string, string, number][] = [
  ["Orka", "orka", 1],
  ["Wagg.le", "waggle", 2],
  ["AniPlanner", "aniplanner", 3],
];
export const FALLBACK_PROJECTS: Project[] = [
  ...FALLBACK_FEATURED,
  ...TO_WRITE.map(([title, slug, tile]) => ({
    title,
    summary: "",
    timeline: "",
    role: "",
    tools: [],
    media: { poster: `/media/archive-tile${tile}.jpg` },
    href: `/work/${slug}`,
    label: title,
    placeholder: true,
  })),
];
