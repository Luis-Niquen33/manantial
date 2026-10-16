// Publica la versión sin servidor en GitHub Pages (rama gh-pages).
import { execSync } from "node:child_process";
import { copyFileSync, writeFileSync } from "node:fs";

const run = (command, options = {}) => execSync(command, { stdio: "inherit", ...options });
const remote = execSync("git remote get-url origin", { encoding: "utf8" }).trim();
const repo = remote.replace(/\.git$/, "").split("/").pop();

run("npx vite build", { env: { ...process.env, VITE_STATIC: "true", VITE_BASE: `/${repo}/` } });
copyFileSync("dist/index.html", "dist/404.html");
writeFileSync("dist/.nojekyll", "");

run("git init -q -b gh-pages", { cwd: "dist" });
run("git add -A", { cwd: "dist" });
run('git commit -q --allow-empty -m "Publicar en GitHub Pages"', { cwd: "dist" });
run(`git push -f ${remote} gh-pages`, { cwd: "dist" });
console.log(`\nListo: https://${remote.split("/")[3].toLowerCase()}.github.io/${repo}/`);
