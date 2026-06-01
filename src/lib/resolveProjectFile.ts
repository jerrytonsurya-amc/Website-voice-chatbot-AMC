import fs from "fs";
import path from "path";

/** Resolve project-root files on Vercel serverless and local dev. */
export function resolveProjectFile(...segments: string[]): string {
  const candidates = [
    path.join(process.cwd(), ...segments),
    path.join(process.cwd(), "..", ...segments),
    path.join(process.cwd(), "../..", ...segments),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Missing file: ${segments.join("/")} (cwd=${process.cwd()}). ` +
      "Ensure it is committed and listed in vercel.json includeFiles."
  );
}
