// The tools Wessel works with. Brand logos are the only non-system colours
// outside the Focus dioramas (DESIGN.md §6), so they live in /public/tools
// untouched. Sources: studio/brand/tool-logos/SOURCES.md.

export const TOOLS = {
  figma: { name: "Figma", kit: "ux" },
  illustrator: { name: "Illustrator", kit: "ux" },
  "after-effects": { name: "After Effects", kit: "motion" },
  lottiefiles: { name: "LottieFiles", kit: "motion" },
  claude: { name: "Claude", kit: "ai" },
} as const;

export type ToolId = keyof typeof TOOLS;

export const toolSrc = (id: ToolId) => `/tools/${id}.svg`;
