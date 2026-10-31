// Pages you've left stay in the DOM, hidden (React Activity), so a plain
// document.querySelector can find the copy on a page you're not looking at.

/** The first match on the page in view: hidden pages render no boxes. */
export function onPage<E extends Element = HTMLElement>(selector: string): E | null {
  for (const el of document.querySelectorAll<E>(selector)) if (el.getClientRects().length) return el;
  return null;
}

/** Which part of the site the path is in, for CSS that differs by page
 *  (html[data-route]); a :has() on the page would also match hidden ones. */
export const routeOf = (path: string) => (path === "/" ? "home" : path.split("/")[1] || "");

/** Sets html[data-route] and the header's data-past (only home starts
 *  with a hero in view) before the first paint; the header keeps both current. */
export const routeScript = `try{var h=document.documentElement,p=location.pathname,s=p.split("/")[1];h.dataset.route=p==="/"?"home":s;h.dataset.past=String(p!=="/")}catch(e){}`;
