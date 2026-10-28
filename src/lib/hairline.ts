// The grid's rows and cells are tiles laid on the hairline colour (--line):
// the 1px gaps between them are that colour showing through. So whatever
// fades, rises or dims (the load entrance, the scroll entrance, the text
// reveal) must be the content inside a tile, never the tile itself, or the
// hairline grey shows through it. This is the one place that rule lives.

let lineMode: string | undefined;
let line = "";

// The hairline colour as computed, refreshed when light/dark changes.
function lineColour() {
  const mode = document.documentElement.dataset.mode ?? "";
  if (mode !== lineMode) {
    const probe = document.createElement("i");
    probe.style.color = "var(--line)";
    document.body.append(probe);
    line = getComputedStyle(probe).color;
    probe.remove();
    lineMode = mode;
  }
  return line;
}

// A tile: an element laid on the hairline colour.
export function onHairline(el: Element) {
  const p = el.parentElement;
  return !!p && getComputedStyle(p).backgroundColor === lineColour();
}

// What may move in el's place: el itself, or, for a tile, the content
// inside it (through nested tiles). An empty tile has nothing to move.
export function movers(el: HTMLElement): HTMLElement[] {
  if (!onHairline(el)) return [el];
  return [...el.children].flatMap((k) => (k instanceof HTMLElement ? movers(k) : []));
}
