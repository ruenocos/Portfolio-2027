import { ContactPill } from "@/components/shell/ContactPill";
import { Entrance } from "@/components/shell/Entrance";
import { Footer } from "@/components/shell/Footer";
import { Header } from "@/components/shell/Header";
import { PageFade } from "@/components/shell/PageFade";
import { SmoothScroll } from "@/components/shell/SmoothScroll";

// The site shell: the ruled canvas with the header on top and the footer
// at the bottom. Rows share 1px hairlines through the page's gap.
// (Sanity Studio lives outside this group, so it gets none of it.)
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip text-label">
        Skip to content
      </a>
      <div className="page" id="top">
        <Header />
        <PageFade>
          <main id="main">{children}</main>
          <Footer />
        </PageFade>
      </div>
      <ContactPill />
      <Entrance />
      <SmoothScroll />
    </>
  );
}
