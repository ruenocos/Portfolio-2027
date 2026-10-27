import Link from "next/link";
import { Arrow } from "@/components/parts/Arrow";
import { Hop } from "@/components/shell/Hop";
import { Row } from "@/components/shell/Row";
import { Shell } from "@/components/shell/Shell";

// Any unknown path. It sits outside the (site) group, so it brings the
// shell itself. Proposed copy, marked data-mock until Wons picks the wording.
export default function NotFound() {
  return (
    <Shell>
      <Row as="section" className="p-inset min-h-[60svh] flex flex-col justify-end gap-4" data-mock>
        <p className="text-label text-mute">
          <span className="text-tang-ink">#</span> 404
        </p>
        <h1 className="text-statement">This page isn’t in the file.</h1>
        <Link href="/" className="text-link text-grape self-start">
          <Hop text="Back home" /> <Arrow dir="right" />
        </Link>
      </Row>
    </Shell>
  );
}
