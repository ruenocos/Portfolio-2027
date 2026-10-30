import type { Metadata } from "next";
import { NotFoundBody } from "@/components/shell/NotFoundBody";
import { Shell } from "@/components/shell/Shell";

// Any unknown path. It sits outside the (site) group, so it brings the
// shell itself. A notFound() inside the group uses (site)/not-found instead.
export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <Shell>
      <NotFoundBody />
    </Shell>
  );
}
