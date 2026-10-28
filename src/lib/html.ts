import motionTokens from "../../design/motion-tokens.json";
import { BOOT_KEY } from "./motion";

// The <head> scripts write the visit's state onto <html> before the first
// paint: data-mode, data-motion, .pz, data-boot. React owns <html>, and if
// hydration fails anywhere it renders the whole page again on the client
// and resets <html> to its server attributes, wiping all of that. A host or
// browser extension that touches <head> (Netlify added a comment and line
// breaks to every page) sets this off. So the head scripts keep a copy here, and
// restoreHtml() puts back anything that went missing.

declare global {
  interface Window {
    __wslHtml?: [string, string][];
  }
}

// Runs last in the <head> script.
export const snapshotScript = `try{window.__wslHtml=[].map.call(document.documentElement.attributes,function(a){return[a.name,a.value]})}catch(e){}`;

/** Runs once, before any other effect on the first render. A page that
 *  hydrated cleanly still has everything, so this changes nothing there. */
export function restoreHtml() {
  const saved = window.__wslHtml;
  if (!saved) return;
  const root = document.documentElement;
  for (const [name, value] of saved) {
    if (name === "class") {
      for (const c of value.split(" ")) if (c && c !== "entering") root.classList.add(c);
      continue;
    }
    if (name === "data-boot") {
      // Only while the intro can still start: not once it has played, nor
      // after the CSS failsafe has cleared the sheet.
      let played = true;
      try {
        played = !!sessionStorage.getItem(BOOT_KEY);
      } catch {}
      const late = performance.now() > motionTokens.intro.failsafeS * 1000;
      if (!played && !late && !root.dataset.boot) root.dataset.boot = value;
      continue;
    }
    if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  }
}
