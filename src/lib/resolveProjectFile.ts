import path from "path";

export function resolveProjectFile(filename: string): string {
  return path.join(process.cwd(), filename);
}
