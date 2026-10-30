import Link from "next/link";
import { Arrow } from "@/components/parts/Arrow";
import { Hop } from "./Hop";
import { LostBeat } from "./LostBeat";
import { Row } from "./Row";

// The 404's content. The copy is a placeholder, marked data-mock.
export function NotFoundBody() {
  return (
    <Row as="section" className="p-inset min-h-[40svh] flex flex-col justify-end gap-4" data-mock>
      <LostBeat />
      <p className="text-label text-mute">
        <span className="text-tang-ink">#</span> 404
      </p>
      <h1 className="text-statement">This page isn’t in the file.</h1>
      <Link href="/" className="text-link text-grape self-start py-3">
        <Hop text="Back home" /> <Arrow dir="right" />
      </Link>
    </Row>
  );
}
