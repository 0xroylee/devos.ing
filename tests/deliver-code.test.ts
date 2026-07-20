import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

const scaffoldModule =
  "../examples/workflows/deliver-code/skills/deliver-code/scripts/scaffold.mjs";
const { scaffoldRepository } = await import(scaffoldModule);

describe("deliver-code scaffold", () => {
  test("creates the complete repository and sibling knowledge skeleton", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "deliver-code-repo-"));
    const knowledgeDir = join(dirname(repoDir), `${basename(repoDir)}.knowledge`);
    try {
      const report = await scaffoldRepository({ repoDir, knowledgeDir });

      expect(report.createdFiles).toContain(join(repoDir, "CONTEXT.md"));
      expect(report.createdFiles).toContain(join(repoDir, "docs", "architecture.md"));
      expect(report.createdFiles).toContain(join(repoDir, ".scratch", "deliver-code", "README.md"));
      expect(report.createdFiles).toContain(join(knowledgeDir, "README.md"));
      expect(await readFile(join(repoDir, "AGENTS.md"), "utf8")).toContain(
        "<!-- deliver-code:start -->",
      );
      expect(await readFile(join(repoDir, "AGENTS.md"), "utf8")).toContain(knowledgeDir);
      expect(await readFile(join(repoDir, "CONTEXT.md"), "utf8")).not.toContain("Customer");
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(knowledgeDir, { recursive: true, force: true });
    }
  });

  test("is idempotent on repeat execution", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "deliver-code-repo-"));
    const knowledgeDir = join(dirname(repoDir), `${basename(repoDir)}.knowledge`);
    try {
      await scaffoldRepository({ repoDir, knowledgeDir });
      const repeated = await scaffoldRepository({ repoDir, knowledgeDir });

      expect(repeated.createdFiles).toEqual([]);
      expect(repeated.updatedFiles).toEqual([]);
      expect(repeated.preservedFiles).toContain(join(repoDir, "CONTEXT.md"));
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(knowledgeDir, { recursive: true, force: true });
    }
  });
});
