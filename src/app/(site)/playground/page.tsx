import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";

export const metadata: Metadata = { title: "Playground" };

// The endless draggable canvas comes next.
export default function PlaygroundPage() {
  return <PageIntro title="Playground" text="Drag around an endless wall of experiments. Coming soon." />;
}
