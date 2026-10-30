import { NotFoundBody } from "@/components/shell/NotFoundBody";

// notFound() from a page in the group (an unknown case slug): the (site)
// layout already brings the shell, so this is the content only.
export default function NotFound() {
  return <NotFoundBody />;
}
