import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const root = process.cwd();
const routesDir = path.join(root, "routes");
const apiDir = path.join(root, "api");

const entries = [
  "live-config.ts",
  "live-token.ts",
  "tools.ts",
  "chat.ts",
];

async function main() {
  if (!fs.existsSync(routesDir)) {
    throw new Error("Missing routes/ directory");
  }

  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  for (const file of entries) {
    const entry = path.join(routesDir, file);
    if (!fs.existsSync(entry)) {
      throw new Error(`Missing route source: ${entry}`);
    }
  }

  await esbuild.build({
    entryPoints: entries.map((file) => path.join(routesDir, file)),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    outdir: apiDir,
    outExtension: { ".js": ".js" },
    packages: "external",
    sourcemap: true,
    logLevel: "info",
  });

  console.log("API routes built to api/*.js for Vercel");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
