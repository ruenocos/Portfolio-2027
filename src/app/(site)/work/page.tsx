import type { Metadata } from "next";
import { Row } from "@/components/shell/Row";

export const metadata: Metadata = { title: "Work" };

// Placeholder so the shell can be tried end to end. Built in Phase 4.
export default function WorkPage() {
  return (
    <Row as="section" className="p-inset min-h-[60svh] flex flex-col justify-end gap-4">
      <p className="text-label text-mute" data-mock>
        <span className="text-tang-ink">#</span> Placeholder · Phase 4
      </p>
      <h1 className="text-statement">Work</h1>
    </Row>
  );
}
