import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import Button from "@/components/Button";
import { listProjects } from "@/lib/figures/store";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Projects · Sensationalize Science" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getSessionUser();
  const projects = listProjects(user?.id ?? null);

  return (
    <section className="section" style={{ paddingTop: 44 }}>
      <Container>
        <header className="qc-header">
          <div>
            <h1 className="section-title" style={{ fontSize: "clamp(28px, 4.5vw, 44px)" }}>
              Production projects
            </h1>
            <p className="section-desc" style={{ marginLeft: 0 }}>
              Papers in the production pipeline, newest first.
            </p>
          </div>
          <Button href="/projects/new" variant="blue">
            New project
          </Button>
        </header>

        {projects.length === 0 ? (
          <div className="qc-empty">
            <h3>No projects yet</h3>
            <p>Start one by uploading a paper for figure extraction and review.</p>
            <Button href="/projects/new" variant="blue">
              Upload a paper
            </Button>
          </div>
        ) : (
          <ul className="qc-project-list">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}`}>
                  <strong>
                    {project.paperTitle ?? project.sourceFileName ?? "Untitled project"}
                  </strong>
                  <span className="qc-status">{project.status.replace(/_/g, " ")}</span>
                  <time dateTime={new Date(project.createdAt).toISOString()}>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
