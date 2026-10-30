"use client";

import { usePathname } from "next/navigation";
import { SectionLabel } from "@/components/parts/SectionLabel";

// The spacer above the footer. On home the bookend takes its place, so it
// isn't drawn there. Read from the path, not from a `:has(.bk)` rule: the
// router keeps pages you've left in the DOM, and a selector that has to tell
// a hidden page from a showing one made every inline style write on the
// site restyle the whole document (visible scroll lag).
export function FooterAir() {
  if (usePathname() === "/") return null;
  return (
    <div className="frame divider divider-tall footer-air" aria-hidden="true">
      <div className="side" />
      <div className="cell bg-dots">
        <SectionLabel name="Contact" as="p" />
      </div>
      <div className="side" />
    </div>
  );
}
