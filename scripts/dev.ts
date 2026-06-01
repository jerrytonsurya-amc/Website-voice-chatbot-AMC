import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(root, "..");

const children: ChildProcess[] = [];

function run(command: string, args: string[], label: string) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
    }
    shutdown(code ?? 0);
  });

  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Starting local dev:\n  API  → http://localhost:3000\n  Vite → http://localhost:5173\n");
console.log("Open http://localhost:5173 and use Initiate voice chat.\n");

run("npx", ["tsx", "scripts/local-api.ts"], "api");
run("npx", ["vite", "--port", "5173"], "vite");
