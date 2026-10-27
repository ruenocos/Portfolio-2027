import type { Metadata } from "next";
import { About } from "@/components/home/About";
import { Archive } from "@/components/home/Archive";
import { Bookend } from "@/components/home/Bookend";
import { Focus } from "@/components/home/Focus";
import { Hero } from "@/components/home/Hero";
import { Divider } from "@/components/parts/Divider";
import { ProjectRows } from "@/components/parts/ProjectRow";
import { getHome } from "@/content/get";

// Page meta from the approved copy (home-copy_v01.md, S16).
export const metadata: Metadata = {
  title: { absolute: "Wessel Oud · UI/UX and motion designer" },
  description:
    "Medior UI/UX and motion designer in the Netherlands, currently at WP Masters. I design it, bring it to life, and automate the boring parts.",
};

// Home (DESIGN.md §5 page order): hero → About → Selected work → Focus →
// See more → bookend, then the shell's footer.
export default async function Home() {
  const c = await getHome();
  return (
    <>
      <Hero hero={c.hero} />
      <Divider label={{ name: "About" }} tall />
      <About about={c.about} />
      <Divider label={{ name: "Selected work" }} id="wdiv" />
      <ProjectRows projects={c.projects} id="work" />
      <Divider label={{ name: "Focus" }} />
      <Focus focus={c.focus} />
      <Divider label={{ name: "See more" }} />
      <Archive cards={c.archive} />
      <Bookend />
    </>
  );
}
