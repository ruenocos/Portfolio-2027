import { Hero } from "@/components/Hero";
import { WorkStage } from "@/components/WorkStage";
import { Contact } from "@/components/Contact";
import { getProjects, getSite } from "@/content/get";

// Home sections still to come: what I do, proof in numbers,
// journey teaser and playground peek.
export default async function Home() {
  const [site, projects] = await Promise.all([getSite(), getProjects({ featuredOnly: true })]);

  return (
    <>
      <Hero site={site} />
      <WorkStage projects={projects} />
      <Contact site={site} />
    </>
  );
}
