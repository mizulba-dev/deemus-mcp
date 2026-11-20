import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const skillsRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "plugin/skills",
);

const SHARED_SECTIONS = [
  "### Fields",
  "### Workstreams",
  "### Judgments about another product",
  "### Skills",
  "### Secrets and personal information",
];

function section(markdown: string, heading: string): string | null {
  const lines = markdown.split("\n");
  const start = lines.indexOf(heading);
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,3} /.test(line));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n").trim();
}

function read(skill: string): string {
  return readFileSync(join(skillsRoot, skill, "SKILL.md"), "utf8");
}

describe("record and import skills", () => {
  it.each(SHARED_SECTIONS)("share the same %s section", (heading) => {
    const imported = section(read("import"), heading);
    const recorded = section(read("record"), heading);
    expect(imported, `import: ${heading}`).not.toBeNull();
    expect(recorded).toBe(imported);
  });

  it("detects a drifted section", () => {
    const a = "### Skills\n\none\n\n### Next\n";
    const b = "### Skills\n\ntwo\n";
    expect(section(a, "### Skills")).toBe("one");
    expect(section(b, "### Skills")).not.toBe(section(a, "### Skills"));
    expect(section(a, "### Missing")).toBeNull();
  });
});
