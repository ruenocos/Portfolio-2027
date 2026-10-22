import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/PageIntro";
import { WithContent } from "@/components/WithContent";
import { getProject, getProjects } from "@/content/get";

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  return { title: project?.title ?? "Case study" };
}

// The six-step case study layout lands here in the design pass.
export default async function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;

  return (
    <WithContent
      render={async (options) => {
        const project = await getProject(slug, options);
        if (!project) notFound();
        return <PageIntro title={project.title} text={project.summary} />;
      }}
    />
  );
}
