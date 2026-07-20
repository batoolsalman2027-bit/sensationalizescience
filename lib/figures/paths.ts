import path from "node:path";

/**
 * Where a project's extracted figure crops live.
 *
 * Kept in its own module, free of any heavy imports, so routes that only need
 * to resolve a path (such as the asset server) don't pull in pdfjs and the
 * native canvas binary just to join two strings.
 *
 * Under data/ rather than public/ because extracted figures are unpublished
 * research and must be access-checked, not served statically.
 */
export function figureAssetRoot(projectId: string): string {
  return path.join(process.cwd(), "data", "projects", projectId, "figures");
}
