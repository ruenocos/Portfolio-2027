import { CursorLayer } from "@/components/CursorLayer";
import { AwayTitle } from "./AwayTitle";
import { ContactPill } from "./ContactPill";
import { Entrance } from "./Entrance";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PageFade } from "./PageFade";
import { PageSwitch } from "./PageSwitch";
import { ScrollSystem } from "./ScrollSystem";
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
        {/* Wessel's layer, in page coordinates too: the browser scrolls him
            with the page, so a touch scroll can't leave him a frame behind.
            The shell stays mounted between pages, so he survives every page change. */}
        <CursorLayer />
      </div>
      <ContactPill />
      <PageSwitch />
      <Entrance />
      <SmoothScroll />
      {/* After SmoothScroll, so a new page has jumped to the top before it measures. */}
      <ScrollSystem />
      <AwayTitle />
    </>
  );
}
