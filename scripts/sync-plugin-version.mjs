import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const manifests = [
  "src/plugin/.claude-plugin/plugin.json",
  "src/plugin/.codex-plugin/plugin.json",
];

if (manifests.every((path) => existsSync(path))) {
  const { version } = JSON.parse(readFileSync("package.json", "utf8"));
  for (const path of manifests) {
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    manifest.version = version;
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`synced ${path} to ${version}`);
  }
  execFileSync("git", ["add", ...manifests], { stdio: "inherit" });
}
