import Link from "next/link";
import { Arrow } from "@/components/parts/Arrow";
import { FooterHello } from "./FooterHello";
import { Hop } from "./Hop";
import { EMAIL, LINKEDIN, NAV } from "./nav";
import { Row } from "./Row";

// The same footer on every page. Every "Contact ↓" lands on the hello
// (#contact). There is no contact page.
// One <footer>, so screen readers get the page's contentinfo landmark.
export function Footer() {
  return (
    <footer className="site-foot">
      <section id="contact" aria-labelledby="h-contact" className="frame hello-band">
        <div className="side" />
        <FooterHello email={EMAIL} />
        <div className="side" />
      </section>
      <Row className="flinks">
        <nav aria-label="Footer">
          {NAV.map(({ href, label }) => (
            <Link key={href} className="l" href={href}>
              <Hop text={label} />
            </Link>
          ))}
          <a className="l" href={LINKEDIN} target="_blank" rel="noopener">
            <Hop text="LinkedIn" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </nav>
        <a className="l top" href="#top">
          <Hop text="Back to top" />
          <span className="ar" aria-hidden="true">
            <Arrow dir="up" />
          </span>
        </a>
      </Row>
      <Row className="legal text-small">
        <span>© 2027 Wessel Oud</span>
        <span>Made in the Netherlands</span>
      </Row>
    </footer>
  );
}
