import { spawn } from "child_process";

console.log("Starting Vercel dev (frontend + API routes)...");
console.log("Ensure GEMINI_API_KEY is set in .env and run: npm run build:data first if NAV data changed.\n");

const child = spawn("npx", ["vercel", "dev", "--listen", "3000"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
