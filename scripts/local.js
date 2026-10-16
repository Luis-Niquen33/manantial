import { spawn } from "node:child_process";

const processes = [
  spawn("node", ["server.js"], { stdio: "inherit" }),
  spawn("npx", ["vite"], { stdio: "inherit", shell: true }),
];

function stopAll() {
  for (const child of processes) child.kill();
  process.exit();
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
for (const child of processes) child.on("exit", (code) => { if (code) stopAll(); });
