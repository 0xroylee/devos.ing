import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

const scaffoldModule =
  "../examples/workflows/deliver-code/skills/deliver-code/scripts/scaffold.mjs";
const { formatScaffoldError, parseArgs, scaffoldRepository } = await import(scaffoldModule);

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

  test("dry-run reports changes without writing files", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "deliver-code-repo-"));
    const knowledgeDir = join(dirname(repoDir), `${basename(repoDir)}.knowledge`);
    try {
      const report = await scaffoldRepository({ repoDir, knowledgeDir, dryRun: true });

      expect(report.dryRun).toBe(true);
      expect(report.createdFiles).toContain(join(repoDir, "CONTEXT.md"));
      await expect(stat(join(repoDir, "CONTEXT.md"))).rejects.toThrow();
      await expect(stat(knowledgeDir)).rejects.toThrow();
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(knowledgeDir, { recursive: true, force: true });
    }
  });

  test("preserves existing documents while updating only the owned AGENTS section", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "deliver-code-repo-"));
    const knowledgeDir = join(dirname(repoDir), `${basename(repoDir)}.knowledge`);
    await mkdir(join(repoDir, "docs"), { recursive: true });
    await writeFile(join(repoDir, "docs", "architecture.md"), "# Custom architecture\n");
    await writeFile(join(repoDir, "AGENTS.md"), "# User rules\n");
    try {
      await scaffoldRepository({ repoDir, knowledgeDir });

      expect(await readFile(join(repoDir, "docs", "architecture.md"), "utf8")).toBe(
        "# Custom architecture\n",
      );
      const agents = await readFile(join(repoDir, "AGENTS.md"), "utf8");
      expect(agents).toContain("# User rules");
      expect(agents.match(/<!-- deliver-code:start -->/g)).toHaveLength(1);
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(knowledgeDir, { recursive: true, force: true });
    }
  });

  test("stops on incompatible paths and malformed ownership markers", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "deliver-code-repo-"));
    const knowledgeDir = join(dirname(repoDir), `${basename(repoDir)}.knowledge`);
    try {
      await writeFile(join(repoDir, "docs"), "not a directory");
      await expect(scaffoldRepository({ repoDir, knowledgeDir })).rejects.toThrow(
        "Scaffold collision: expected directory",
      );
      await expect(stat(join(repoDir, "CONTEXT.md"))).rejects.toThrow();
      await expect(stat(knowledgeDir)).rejects.toThrow();
      await rm(join(repoDir, "docs"));
      await writeFile(join(repoDir, "AGENTS.md"), "<!-- deliver-code:start -->\n");
      await expect(scaffoldRepository({ repoDir, knowledgeDir })).rejects.toThrow(
        "invalid deliver-code markers",
      );
      await expect(stat(join(repoDir, "CONTEXT.md"))).rejects.toThrow();
      await expect(stat(knowledgeDir)).rejects.toThrow();
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(knowledgeDir, { recursive: true, force: true });
    }
  });

  test("parses explicit CLI permissions and explains knowledge-directory denial", () => {
    expect(
      parseArgs([
        "--repo",
        "/work/repo",
        "--knowledge-dir",
        "/work/repo.knowledge",
        "--dry-run",
        "--json",
      ]),
    ).toEqual({
      repoDir: "/work/repo",
      knowledgeDir: "/work/repo.knowledge",
      dryRun: true,
      json: true,
    });
    expect(
      formatScaffoldError(
        Object.assign(new Error("denied"), {
          code: "EACCES",
          path: "/work/repo.knowledge/research",
        }),
        "/work/repo.knowledge",
      ),
    ).toBe(
      "Cannot create or update the sibling knowledge directory /work/repo.knowledge. Request filesystem permission; do not move heavy research into the repository.",
    );
  });
});
