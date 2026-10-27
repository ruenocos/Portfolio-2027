import Link from "next/link";
import { Arrow } from "@/components/parts/Arrow";
import { Row } from "@/components/shell/Row";

// Placeholder until the home build (Phase 4). The hero is a [data-hero], so
// the header wordmark waits until it has scrolled away, like the real one.
export default function Home() {
  return (
    <>
      <Row as="section" data-hero className="bg-dots flex flex-col justify-end p-inset min-h-[clamp(420px,72svh_-_70px,620px)] stack:min-h-[clamp(480px,80svh_-_91px,720px)]">
        <h1 className="text-display text-ink uppercase">Wessel Oud</h1>
      </Row>
      <Row className="p-inset">
        <Link href="/system" className="text-label text-grape">
          System <Arrow dir="right" />
        </Link>
      </Row>
    </>
  );
}
