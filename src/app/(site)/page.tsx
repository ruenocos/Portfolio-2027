import { Hero } from "@/components/Hero";
import { WorkStage } from "@/components/WorkStage";
import { Contact } from "@/components/Contact";
import { WithContent } from "@/components/WithContent";
import { getProjects, getSite } from "@/content/get";
import type { FetchOptions } from "@/sanity/live";

// Home sections still to come: what I do, proof in numbers,
// journey teaser and playground peek.
async function Home(options: FetchOptions) {
  const [site, projects] = await Promise.all([getSite(options), getProjects(options, { featuredOnly: true })]);

  return (
    <>
      <Hero site={site} />
      <WorkStage projects={projects} />
      <Contact site={site} />
    </>
  );
}

export default function HomePage() {
  return <WithContent render={Home} />;
}
