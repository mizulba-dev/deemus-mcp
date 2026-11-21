import {
  chmodSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = join(root, "src/plugin");

const claudeManifest = "src/plugin/.claude-plugin/plugin.json";
const codexManifest = "src/plugin/.codex-plugin/plugin.json";

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function versionMismatches(versions: Record<string, unknown>): string[] {
  const expected = versions["package.json"];
  return Object.entries(versions)
    .filter(([, version]) => version !== expected)
    .map(
      ([file, version]) =>
        `${file}: ${String(version)} (package.json: ${String(expected)})`,
    );
}

function executableFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...executableFiles(path));
    } else if (statSync(path).mode & 0o111) {
      found.push(path);
    }
  }
  return found;
}

describe("plugin manifests", () => {
  it("keeps package.json and both plugin.json versions in sync", () => {
    const mismatches = versionMismatches({
      "package.json": readJson("package.json").version,
      [claudeManifest]: readJson(claudeManifest).version,
      [codexManifest]: readJson(codexManifest).version,
    });

    expect(mismatches).toEqual([]);
  });

  it("names the files whose version drifted", () => {
    expect(
      versionMismatches({
        "package.json": "1.0.0",
        [claudeManifest]: "1.0.0",
        [codexManifest]: "0.9.0",
      }),
    ).toEqual([`${codexManifest}: 0.9.0 (package.json: 1.0.0)`]);
  });

  it("points every marketplace source at an existing plugin directory", () => {
    const marketplace = readJson(".claude-plugin/marketplace.json") as {
      plugins: { name: string; source: string }[];
    };

    expect(marketplace.plugins.length).toBeGreaterThan(0);
    for (const plugin of marketplace.plugins) {
      const source = resolve(root, plugin.source);
      expect(existsSync(source), `${plugin.name}: ${plugin.source}`).toBe(true);
      expect(
        existsSync(join(source, ".claude-plugin/plugin.json")),
        `${plugin.name}: plugin.json`,
      ).toBe(true);
    }
  });

  it("connects both plugins to the remote server only, with nothing run on connect", () => {
    for (const file of [claudeManifest, codexManifest]) {
      const ref = readJson(file).mcpServers;
      expect(typeof ref, file).toBe("string");
      const servers = readJson(join("src/plugin", ref as string))
        .mcpServers as Record<string, Record<string, unknown>>;

      expect(Object.keys(servers), file).toEqual(["deemus"]);
      const { _meta, ...server } = servers.deemus;
      expect(server, file).toEqual({
        type: "http",
        url: "https://mcp.deemus.app/mcp",
      });
    }
  });

  it("ships no executable files under src/plugin", () => {
    expect(executableFiles(pluginRoot)).toEqual([]);
  });

  it("detects an executable bit when one is set", () => {
    const dir = mkdtempSync(join(tmpdir(), "plugin-mode-"));
    try {
      const plain = join(dir, "plain.mjs");
      const exec = join(dir, "exec.mjs");
      writeFileSync(plain, "");
      writeFileSync(exec, "");
      chmodSync(plain, 0o644);
      chmodSync(exec, 0o755);

      expect(executableFiles(dir)).toEqual([exec]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
