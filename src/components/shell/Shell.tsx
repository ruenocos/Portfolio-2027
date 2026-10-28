import { CursorLayer } from "@/components/CursorLayer";
import { ContactPill } from "./ContactPill";
import { Entrance } from "./Entrance";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HoverPick } from "./HoverPick";
import { PageFade } from "./PageFade";
import { PageSwitch } from "./PageSwitch";
import { SmoothScroll } from "./SmoothScroll";

// The site shell: the ruled canvas with the header on top and the footer
// at the bottom. Rows share 1px hairlines through the page's gap.
// Used by the (site) layout and by the 404, which sits outside it.
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip text-label">
        Skip to content
      </a>
      <div className="page" id="top">
        <Header />
        <PageFade>
          <main id="main" tabIndex={-1}>{children}</main>
          <Footer />
        </PageFade>
        {/* Wessel's marks: page coordinates, so they scroll with it. */}
        <div id="ovl" className="ovl" aria-hidden="true" />
      </div>
      <ContactPill />
      {/* Wessel's layer: the shell stays mounted between pages, so he survives every page change. */}
      <CursorLayer />
      <PageSwitch />
      <Entrance />
      <SmoothScroll />
      <HoverPick />
    </>
  );
}
