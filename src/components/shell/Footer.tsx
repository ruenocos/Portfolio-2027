import Link from "next/link";
import { Arrow } from "@/components/parts/Arrow";
import { CopyEmail } from "./CopyEmail";
import { FooterAir } from "./FooterAir";
import { FooterMoment } from "./FooterMoment";
import { Hop } from "./Hop";
import { EMAIL, LINKEDIN, NAV } from "./nav";
import { Row } from "./Row";

// Every "Contact ↓" lands here (#contact). There is no contact page.
// On home the bookend sits right above it, in place of the spacer.
// One <footer>, so screen readers get the page's contentinfo landmark.
export function Footer() {
  return (
    <footer className="site-foot">
      {/* Named like every other band, so "Contact ↓" lands on a label. */}
      <FooterAir />
      <section id="contact" aria-labelledby="h-contact" className="frame">
        <h2 id="h-contact" className="sr-only">
          Contact
        </h2>
        <div className="side" />
        <div className="fcols">
          {/* Off home, Wessel does one small job on the email here. */}
          <FooterMoment>
            <h3 className="text-lead">Email</h3>
            <CopyEmail email={EMAIL} />
          </FooterMoment>
          <div className="cell">
            <h3 className="text-lead">Elsewhere</h3>
            <a className="l" href={LINKEDIN} target="_blank" rel="noopener">
              <Hop text="LinkedIn" />
              <span className="sr-only"> (opens in a new tab)</span>
              <span className="ext" aria-hidden="true">
                <Arrow dir="out" />
              </span>
            </a>
          </div>
          <div className="cell">
            <h3 className="text-lead">More</h3>
            {NAV.map(({ href, label }) => (
              <Link key={href} className="l" href={href}>
                <Hop text={label} />
              </Link>
            ))}
            <a className="l" href="#top">
              <Hop text="Back to top" />
              <span className="ar" aria-hidden="true">
                <Arrow dir="up" />
              </span>
            </a>
          </div>
        </div>
        <div className="side" />
      </section>
      <Row className="legal text-small">
        <span>© 2027 Wessel Oud</span>
        <span>Made in the Netherlands</span>
      </Row>
    </footer>
  );
}
