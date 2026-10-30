import tokens from "../../design/tokens.json";

// Light and dark. The system decides, until the visitor flips the header
// switch: that choice is remembered on this device (DESIGN.md §3).

export type Mode = "light" | "dark";

export const MODE_KEY = "wsl-theme";

// Self-contained on purpose: it's also stringified into the <head> script
// so the right mode is set before the first paint.
export function resolveMode(): Mode {
  try {
    const own = localStorage.getItem("wsl-theme");
    if (own === "light" || own === "dark") return own;
  } catch {}
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const modeScript = `try{document.documentElement.dataset.mode=(${resolveMode.toString()})()}catch(e){}`;

// The browser chrome (phone address bar) takes the canvas colour of the mode.
const CANVAS: Record<Mode, string> = {
  light: tokens.color.light.canvas.$value,
  dark: tokens.color.dark.canvas.$value,
};

export function paintThemeColor(mode: Mode) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", CANVAS[mode]);
}

export const themeColorScript = `try{document.querySelector('meta[name="theme-color"]').content=${JSON.stringify(CANVAS)}[document.documentElement.dataset.mode]}catch(e){}`;
