import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  installAgentSkill,
  parseSkillInstallAgents,
  resolveInstallSkillName,
  resolveInstallSkillSource,
  type SkillInstallAgent,
} from "../src/plugins/skill-installer";

const allAgents: SkillInstallAgent[] = [
  "claude",
  "copilot",
  "codex",
  "cursor",
  "hermes",
  "openclaw",
  "opencode",
];

async function writeSkill(
  path: string,
  input: { name: string; description: string },
): Promise<void> {
  await mkdir(path, { recursive: true });
  await writeFile(
    join(path, "SKILL.md"),
    [
      "---",
      `name: ${input.name}`,
      `description: "${input.description}"`,
      "---",
      "",
      `# ${input.name}`,
      "",
      `Fake ${input.name} skill for installer tests.`,
    ].join("\n"),
  );
}

describe("skill installer", () => {
  test("resolves canonical and frontmatter-derived installed skill names", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-name-metadata-"));
    const skillDir = join(homeDir, "different-folder");
    try {
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, "SKILL.md"),
        "---\nname: actual-skill-name\ndescription: Test skill.\n---\n",
      );

      await expect(
        resolveInstallSkillName(skillDir, {
          homeDir,
          expectedName: "actual-skill-name",
        }),
      ).resolves.toBe("actual-skill-name");
      await expect(
        resolveInstallSkillName(skillDir, { homeDir, expectedName: "wrong-name" }),
      ).rejects.toThrow("Installed skill name mismatch");
      await expect(
        resolveInstallSkillName("custom-review", {
          homeDir,
          expectedName: "custom-review-agent",
        }),
      ).resolves.toBe("custom-review-agent");
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("does not expose the removed pony-trail bundled skill", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));

    try {
      await expect(resolveInstallSkillSource("pony-trail", { homeDir })).rejects.toThrow(
        "Skill source not found: pony-trail",
      );
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("resolves the bundled review past decisions skill by name", async () => {
    const source = await resolveInstallSkillSource("review-past-decisions");

    expect(source.name).toBe("review-past-decisions");
    expect(source.kind).toBe("bundled");
    expect(source.path.endsWith(join("bundled-skills", "review-past-decisions"))).toBe(true);
    expect(await readFile(join(source.path, "SKILL.md"), "utf8")).toContain(
      "name: review-past-decisions",
    );
  });

  test("resolves the bundled creating bundle skills authoring skill by name", async () => {
    const source = await resolveInstallSkillSource("creating-bundle-skills");

    expect(source.name).toBe("creating-bundle-skills");
    expect(source.kind).toBe("bundled");
    expect(source.path.endsWith(join("bundled-skills", "creating-bundle-skills"))).toBe(true);
    expect(await readFile(join(source.path, "SKILL.md"), "utf8")).toContain(
      "Create the smallest repeatable workflow",
    );
  });

  test("resolves the bundled workflow skill authoring helper by name", async () => {
    const source = await resolveInstallSkillSource("writing-workflow-skills");

    expect(source.name).toBe("writing-workflow-skills");
    expect(source.kind).toBe("bundled");
    expect(source.path.endsWith(join("bundled-skills", "writing-workflow-skills"))).toBe(true);

    const skill = await readFile(join(source.path, "SKILL.md"), "utf8");
    expect(skill).toContain("name: writing-workflow-skills");
    expect(skill).toContain("Use when writing or reviewing Omniskills entry skills");
    expect(skill).toContain("Use `creating-bundle-skills` for the whole bundle");
    expect(skill).toContain("mattpocock:grilling");
    expect(skill).toContain("mattpocock:to-spec");
    expect(skill).toContain("- Decision:");
  });

  test("defaults to the creating bundle skills authoring skill", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));

    try {
      const result = await installAgentSkill({
        homeDir,
        agents: ["codex"],
        dryRun: true,
      });

      expect(result.skillName).toBe("creating-bundle-skills");
      expect(result.targets[0]).toMatchObject({
        agent: "codex",
        status: "would_install",
      });
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("installs the bundled workflow skill authoring helper into Codex targets", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));

    try {
      const result = await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: ["codex"],
      });

      expect(result.skillName).toBe("writing-workflow-skills");
      expect(result.targets[0]).toMatchObject({
        agent: "codex",
        status: "installed",
      });

      await expect(
        stat(join(homeDir, ".agents", "skills", "writing-workflow-skills", "SKILL.md")),
      ).resolves.toBeTruthy();
      await expect(
        stat(join(homeDir, ".codex", "skills", "writing-workflow-skills", "SKILL.md")),
      ).resolves.toBeTruthy();
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("parses every canonical skill target and existing aliases", () => {
    expect(
      parseSkillInstallAgents(
        "Claude,codex,cursor,opencode,opencodex,hermes,openclaw,github-copilot,GitHub Copilot,githubcopilot",
      ),
    ).toEqual(["claude", "codex", "cursor", "opencode", "hermes", "openclaw", "copilot"]);
  });

  test("rejects unknown agent targets even when mixed with supported aliases", () => {
    expect(() => parseSkillInstallAgents("codex,unknown-agent")).toThrow(
      "Unknown skill install agent: unknown-agent",
    );
  });

  test("installs the bundled review past decisions skill into directory and Cursor targets", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));

    try {
      const result = await installAgentSkill({
        source: "review-past-decisions",
        homeDir,
        agents: ["codex", "cursor"],
      });

      expect(result.skillName).toBe("review-past-decisions");
      expect(result.targets.map((target) => target.status)).toEqual(["installed", "installed"]);

      await expect(
        stat(join(homeDir, ".agents", "skills", "review-past-decisions", "SKILL.md")),
      ).resolves.toBeTruthy();
      await expect(
        stat(join(homeDir, ".codex", "skills", "review-past-decisions", "SKILL.md")),
      ).resolves.toBeTruthy();

      const cursorRulePath = join(homeDir, ".cursor", "rules", "review-past-decisions.mdc");
      await expect(stat(cursorRulePath)).resolves.toBeTruthy();
      expect(await readFile(cursorRulePath, "utf8")).toContain("name: review-past-decisions");
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("resolves mattpocock skills from installed local skill folders", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));
    const sourceDir = join(homeDir, ".agents", "skills", "tdd");

    try {
      await writeSkill(sourceDir, {
        name: "tdd",
        description: "Test-driven development.",
      });

      const aliasSource = await resolveInstallSkillSource("mattpocock:tdd", { homeDir });
      const githubSource = await resolveInstallSkillSource("github:mattpocock/skills/skills/tdd", {
        homeDir,
      });

      expect(aliasSource).toEqual({
        kind: "path",
        name: "tdd",
        path: sourceDir,
      });
      expect(githubSource).toEqual(aliasSource);
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("resolves upstream canonical and interface craft compatibility sources", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));
    const mappings = [
      ["emilkowalski:emil-design-eng", "interface-craft:design-engineering", "emil-design-eng"],
      [
        "emilkowalski:animation-vocabulary",
        "interface-craft:motion-vocabulary",
        "animation-vocabulary",
      ],
      ["emilkowalski:apple-design", "interface-craft:fluid-interface-design", "apple-design"],
      ["emilkowalski:review-animations", "interface-craft:motion-review", "review-animations"],
    ] as const;

    try {
      for (const [, , installedName] of mappings) {
        await writeSkill(join(homeDir, ".agents", "skills", installedName), {
          name: installedName,
          description: `Interface craft test skill: ${installedName}.`,
        });
      }

      for (const [canonical, legacy, installedName] of mappings) {
        const expected = {
          kind: "path" as const,
          name: installedName,
          path: join(homeDir, ".agents", "skills", installedName),
        };
        await expect(resolveInstallSkillSource(canonical, { homeDir })).resolves.toEqual(expected);
        await expect(resolveInstallSkillSource(legacy, { homeDir })).resolves.toEqual(expected);
      }
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("resolves installed bare skill names from local skill folders", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));
    const sourceDir = join(homeDir, ".agents", "skills", "implement");

    try {
      await writeSkill(sourceDir, {
        name: "implement",
        description: "Implement a piece of work based on a plan.",
      });

      const source = await resolveInstallSkillSource("implement", { homeDir });

      expect(source).toEqual({
        kind: "path",
        name: "implement",
        path: sourceDir,
      });
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("refreshes a skill that is already installed at the target path without deleting it", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));
    const sourceDir = join(homeDir, ".agents", "skills", "tdd");

    try {
      await writeSkill(sourceDir, {
        name: "tdd",
        description: "Test-driven development.",
      });

      const result = await installAgentSkill({
        source: "mattpocock:tdd",
        homeDir,
        agents: ["codex"],
        refreshExisting: true,
      });

      expect(result.skillName).toBe("tdd");
      expect(result.targets).toMatchObject([{ agent: "codex", status: "updated" }]);
      await expect(stat(join(sourceDir, "SKILL.md"))).resolves.toBeTruthy();
      await expect(
        stat(join(homeDir, ".codex", "skills", "tdd", "SKILL.md")),
      ).resolves.toBeTruthy();
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("does not refresh a mixed owned and unowned mirror set", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "skill-installer-source-"));
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));
    const sourceDir = join(rootDir, "mixed-ownership");
    const primary = join(homeDir, ".agents", "skills", "mixed-ownership", "SKILL.md");
    const mirror = join(homeDir, ".codex", "skills", "mixed-ownership", "SKILL.md");

    try {
      await writeSkill(sourceDir, {
        name: "mixed-ownership",
        description: "Updated source.",
      });
      await mkdir(join(homeDir, ".agents", "skills", "mixed-ownership"), { recursive: true });
      await mkdir(join(homeDir, ".codex", "skills", "mixed-ownership"), { recursive: true });
      await writeFile(primary, "previously managed\n");
      await writeFile(mirror, "user-owned mirror\n");

      const result = await installAgentSkill({
        source: sourceDir,
        homeDir,
        agents: ["codex"],
        refreshExisting: true,
        refreshExistingArtifactPaths: [dirname(primary)],
      });

      expect(result.targets).toMatchObject([{ agent: "codex", status: "skipped_exists" }]);
      expect(await readFile(primary, "utf8")).toBe("previously managed\n");
      expect(await readFile(mirror, "utf8")).toBe("user-owned mirror\n");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("does not let a shared primary target bypass Codex mirror ownership", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "skill-installer-source-"));
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));
    const sourceDir = join(rootDir, "shared-ownership");
    const primaryDir = join(homeDir, ".agents", "skills", "shared-ownership");
    const primary = join(primaryDir, "SKILL.md");
    const mirror = join(homeDir, ".codex", "skills", "shared-ownership", "SKILL.md");

    try {
      await writeSkill(sourceDir, {
        name: "shared-ownership",
        description: "Updated source.",
      });
      await mkdir(primaryDir, { recursive: true });
      await mkdir(dirname(mirror), { recursive: true });
      await writeFile(primary, "previously managed\n");
      await writeFile(mirror, "user-owned mirror\n");

      const result = await installAgentSkill({
        source: sourceDir,
        homeDir,
        agents: ["openclaw", "codex"],
        refreshExisting: true,
        refreshExistingArtifactPaths: [primaryDir],
      });

      expect(result.targets).toMatchObject([
        { agent: "openclaw", status: "updated" },
        { agent: "codex", status: "skipped_exists" },
      ]);
      expect(await readFile(primary, "utf8")).toContain("Updated source.");
      expect(await readFile(mirror, "utf8")).toBe("user-owned mirror\n");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("explains how to install mattpocock skills when they are missing", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));

    try {
      await expect(resolveInstallSkillSource("mattpocock:tdd", { homeDir })).rejects.toThrow(
        `Matt Pocock tdd skill not found under ${homeDir}. Install or refresh Matt Pocock skills with: omniskill skills install mattpocock/skills. Then retry this command. /setup-matt-pocock-skills configures repo metadata after the skills are installed; it does not install tdd.`,
      );
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("installs a bundled skill into all canonical skill targets", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));

    try {
      const result = await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: allAgents,
      });

      expect(result.skillName).toBe("writing-workflow-skills");
      expect(result.targets.map((target) => target.status)).toEqual([
        "installed",
        "installed",
        "installed",
        "installed",
        "installed",
        "installed",
        "installed",
      ]);
      expect(result.targets).toEqual([
        expect.objectContaining({
          agent: "claude",
          destination: join(homeDir, ".claude", "skills", "writing-workflow-skills"),
          artifactPaths: [join(homeDir, ".claude", "skills", "writing-workflow-skills")],
          status: "installed",
        }),
        expect.objectContaining({
          agent: "copilot",
          destination: join(homeDir, ".agents", "skills", "writing-workflow-skills"),
          artifactPaths: [join(homeDir, ".agents", "skills", "writing-workflow-skills")],
          status: "installed",
        }),
        expect.objectContaining({
          agent: "codex",
          destination: join(homeDir, ".agents", "skills", "writing-workflow-skills"),
          artifactPaths: [
            join(homeDir, ".agents", "skills", "writing-workflow-skills"),
            join(homeDir, ".codex", "skills", "writing-workflow-skills"),
          ],
          status: "installed",
        }),
        expect.objectContaining({
          agent: "cursor",
          destination: join(homeDir, ".cursor", "rules", "writing-workflow-skills.mdc"),
          artifactPaths: [join(homeDir, ".cursor", "rules", "writing-workflow-skills.mdc")],
          status: "installed",
        }),
        expect.objectContaining({
          agent: "hermes",
          destination: join(homeDir, ".hermes", "skills", "writing-workflow-skills"),
          artifactPaths: [join(homeDir, ".hermes", "skills", "writing-workflow-skills")],
          status: "installed",
        }),
        expect.objectContaining({
          agent: "openclaw",
          destination: join(homeDir, ".agents", "skills", "writing-workflow-skills"),
          artifactPaths: [join(homeDir, ".agents", "skills", "writing-workflow-skills")],
          status: "installed",
        }),
        expect.objectContaining({
          agent: "opencode",
          destination: join(homeDir, ".agents", "skills", "writing-workflow-skills"),
          artifactPaths: [join(homeDir, ".agents", "skills", "writing-workflow-skills")],
          status: "installed",
        }),
      ]);

      await expect(
        stat(join(homeDir, ".claude", "skills", "writing-workflow-skills", "SKILL.md")),
      ).resolves.toBeTruthy();
      await expect(
        stat(join(homeDir, ".agents", "skills", "writing-workflow-skills", "SKILL.md")),
      ).resolves.toBeTruthy();
      await expect(
        stat(join(homeDir, ".codex", "skills", "writing-workflow-skills", "SKILL.md")),
      ).resolves.toBeTruthy();
      await expect(
        stat(join(homeDir, ".hermes", "skills", "writing-workflow-skills", "SKILL.md")),
      ).resolves.toBeTruthy();
      const cursorRulePath = join(homeDir, ".cursor", "rules", "writing-workflow-skills.mdc");
      await expect(stat(cursorRulePath)).resolves.toBeTruthy();
      expect(await readFile(cursorRulePath, "utf8")).toContain("name: writing-workflow-skills");
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("updates Hermes and shared OpenClaw skill targets", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));
    const sharedSkill = join(homeDir, ".agents", "skills", "writing-workflow-skills", "SKILL.md");
    const hermesSkill = join(homeDir, ".hermes", "skills", "writing-workflow-skills", "SKILL.md");

    try {
      await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: ["openclaw", "hermes"],
      });
      await writeFile(sharedSkill, "stale shared skill");
      await writeFile(hermesSkill, "stale Hermes skill");

      const dryRun = await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: ["openclaw", "hermes"],
        operation: "update",
        dryRun: true,
      });
      expect(dryRun.targets.map(({ status }) => status)).toEqual(["would_update", "would_update"]);

      const updated = await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: ["openclaw", "hermes"],
        operation: "update",
      });
      expect(updated.targets.map(({ status }) => status)).toEqual(["updated", "updated"]);
      expect(await readFile(sharedSkill, "utf8")).toContain("name: writing-workflow-skills");
      expect(await readFile(hermesSkill, "utf8")).toContain("name: writing-workflow-skills");
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("updates existing bundled skill targets when requested", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));
    const installedSkillPath = join(
      homeDir,
      ".agents",
      "skills",
      "writing-workflow-skills",
      "SKILL.md",
    );
    const legacyInstalledSkillPath = join(
      homeDir,
      ".codex",
      "skills",
      "writing-workflow-skills",
      "SKILL.md",
    );

    try {
      await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: ["codex"],
      });
      await writeFile(installedSkillPath, "stale skill");
      await writeFile(legacyInstalledSkillPath, "stale legacy skill");

      const dryRun = await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: ["codex"],
        dryRun: true,
        operation: "update",
      });

      expect(dryRun.targets[0]).toMatchObject({
        agent: "codex",
        status: "would_update",
      });
      expect(await readFile(installedSkillPath, "utf8")).toBe("stale skill");

      const result = await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: ["codex"],
        operation: "update",
      });

      expect(result.targets[0]).toMatchObject({
        agent: "codex",
        status: "updated",
      });
      expect(await readFile(installedSkillPath, "utf8")).toContain("name: writing-workflow-skills");
      expect(await readFile(legacyInstalledSkillPath, "utf8")).toContain(
        "name: writing-workflow-skills",
      );
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("keeps matching bundled skill targets when update is requested", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));

    try {
      await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: ["codex"],
      });

      const result = await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: ["codex"],
        operation: "update",
      });

      expect(result.targets[0]).toMatchObject({
        agent: "codex",
        status: "already_present",
      });
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("dry-runs Cursor rule installation", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));

    try {
      const result = await installAgentSkill({
        source: "writing-workflow-skills",
        homeDir,
        agents: ["cursor"],
        dryRun: true,
      });

      expect(result.targets[0]).toMatchObject({
        agent: "cursor",
        destination: join(homeDir, ".cursor", "rules", "writing-workflow-skills.mdc"),
        status: "would_install",
      });
      await expect(
        stat(join(homeDir, ".cursor", "rules", "writing-workflow-skills.mdc")),
      ).rejects.toThrow();
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("supports dry-run and overwrite protection for path-based skills", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "skill-installer-source-"));
    const homeDir = await mkdtemp(join(tmpdir(), "skill-installer-home-"));
    const sourceDir = join(rootDir, "custom-skill");
    const existingSkillDir = join(homeDir, ".agents", "skills", "custom-skill");

    try {
      await mkdir(sourceDir, { recursive: true });
      await writeFile(
        join(sourceDir, "SKILL.md"),
        [
          "---",
          "name: custom-skill",
          "description: Use when testing a path-based skill install.",
          "---",
          "",
          "# Custom Skill",
        ].join("\n"),
      );
      await mkdir(existingSkillDir, { recursive: true });
      await writeFile(join(existingSkillDir, "SKILL.md"), "existing");

      const dryRun = await installAgentSkill({
        source: sourceDir,
        homeDir,
        agents: ["claude"],
        dryRun: true,
      });

      expect(dryRun.targets[0]).toMatchObject({
        agent: "claude",
        status: "would_install",
      });
      await expect(
        stat(join(homeDir, ".claude", "skills", "custom-skill", "SKILL.md")),
      ).rejects.toThrow();

      const skipped = await installAgentSkill({
        source: sourceDir,
        homeDir,
        agents: ["codex"],
      });

      expect(skipped.targets[0]).toMatchObject({
        agent: "codex",
        status: "skipped_exists",
      });
      expect(await readFile(join(existingSkillDir, "SKILL.md"), "utf8")).toBe("existing");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
      await rm(homeDir, { recursive: true, force: true });
    }
  });
});
