import Link from "next/link";
import { Arrow } from "@/components/parts/Arrow";
import { CopyEmail } from "./CopyEmail";
import { Hop } from "./Hop";
import { EMAIL, LINKEDIN, NAV } from "./nav";
import { Row } from "./Row";

// Every "Contact ↓" lands here (#contact). There is no contact page.
// Home puts its bookend above this in Phase 4.
export function Footer() {
  return (
    <>
      <div className="frame divider-tall" aria-hidden="true">
        <div className="side" />
        <div className="side" />
        <div className="side" />
      </div>
      <section id="contact" aria-labelledby="h-contact" className="frame">
        <h2 id="h-contact" className="sr-only">
          Contact
        </h2>
        <div className="side" />
        <div className="fcols">
          <div className="cell">
            <h3 className="text-lead">Email</h3>
            <a id="mail" className="mail" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
            <CopyEmail email={EMAIL} />
          </div>
          <div className="cell">
            <h3 className="text-lead">Elsewhere</h3>
            <a className="l" href={LINKEDIN} target="_blank" rel="noopener">
              <Hop text="LinkedIn" />
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
    </>
  );
}
