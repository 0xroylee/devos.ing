import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

const scaffoldModule =
  "../examples/workflows/deliver-code/skills/deliver-code/scripts/scaffold.mjs";
const { formatScaffoldError, parseArgs, scaffoldRepository } = await import(scaffoldModule);
const verificationModule =
  "../examples/workflows/deliver-code/skills/deliver-code/scripts/verification-evidence.mjs";
const { collectVerificationEvidence, evaluateVerificationEvidence, renderVerificationOutcome } =
  await import(verificationModule);

const delegatedMetadata = {
  sourceCoordinator: "startup-goal",
  milestoneId: "native-startup-boundary",
  agentId: "implementation-1",
  role: "deliver-code",
  modelRole: "implementation",
  access: "workspace-write",
  candidateIndex: 0,
  candidateCount: 1,
};

const verificationInput = {
  mode: "delegated",
  workspacePath: "/work/ponytrails",
  changeCompletedAt: "2026-07-21T09:00:00.000Z",
  expectedWorkspaceFingerprint: "sha256:approved-change",
  workspaceFingerprint: "sha256:approved-change",
  delegation: delegatedMetadata,
  requirements: [
    { id: "focused", text: "Focused behavior passes." },
    { id: "full", text: "Full repository gate passes." },
  ],
  commands: [
    {
      id: "focused-tests",
      command: "bun test tests/deliver-code.test.ts",
      requirementIds: ["focused"],
    },
    { id: "full-check", command: "bun run check", requirementIds: ["full"] },
  ],
};

function sequenceClock(...values: string[]) {
  let index = 0;
  return () => values[index++] ?? values.at(-1);
}

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

describe("deliver-code verification evidence", () => {
  test.each([
    ["null expected", null, "sha256:approved-change", "sha256:approved-change"],
    ["empty expected", "", "sha256:approved-change", "sha256:approved-change"],
    ["null report", "sha256:approved-change", null, null],
    ["empty report", "sha256:approved-change", "", ""],
    ["null command", "sha256:approved-change", "sha256:approved-change", null],
    ["empty command", "sha256:approved-change", "sha256:approved-change", ""],
  ])("blocks %s workspace fingerprints", (_name, expectedWorkspaceFingerprint, workspaceFingerprint, commandFingerprint) => {
    const outcome = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      expectedWorkspaceFingerprint,
      workspaceFingerprint,
      commands: verificationInput.commands.map((command) => ({
        ...command,
        startedAt: "2026-07-21T09:01:00.000Z",
        completedAt: "2026-07-21T09:02:00.000Z",
        availability: "available",
        exitCode: 0,
        workspaceFingerprint: commandFingerprint,
        stdout: "pass",
        stderr: "",
      })),
      collectedAt: "2026-07-21T09:03:00.000Z",
    });

    expect(outcome.status).toBe("blocked");
  });

  test("collects fresh command evidence after the completed change", async () => {
    const evidence = await collectVerificationEvidence({
      ...verificationInput,
      runner: async ({ command }: { command: string }) => ({
        availability: "available",
        exitCode: 0,
        stdout: `${command}: pass`,
        stderr: "",
        workspaceFingerprint: "sha256:approved-change",
      }),
      now: sequenceClock(
        "2026-07-21T09:01:00.000Z",
        "2026-07-21T09:02:00.000Z",
        "2026-07-21T09:03:00.000Z",
        "2026-07-21T09:04:00.000Z",
        "2026-07-21T09:05:00.000Z",
      ),
    });

    expect(evidence.commands).toEqual([
      expect.objectContaining({
        id: "focused-tests",
        command: "bun test tests/deliver-code.test.ts",
        startedAt: "2026-07-21T09:01:00.000Z",
        completedAt: "2026-07-21T09:02:00.000Z",
        exitCode: 0,
        availability: "available",
        workspaceFingerprint: "sha256:approved-change",
      }),
      expect.objectContaining({
        id: "full-check",
        startedAt: "2026-07-21T09:03:00.000Z",
        completedAt: "2026-07-21T09:04:00.000Z",
        exitCode: 0,
      }),
    ]);
    expect(evidence.collectedAt).toBe("2026-07-21T09:05:00.000Z");
    expect(evidence.expectedWorkspaceFingerprint).toBe("sha256:approved-change");
    expect(evaluateVerificationEvidence(evidence).status).toBe("passed");
  });

  test("blocks completion when any command exits nonzero", async () => {
    const evidence = await collectVerificationEvidence({
      ...verificationInput,
      runner: async ({ id }: { id: string }) => ({
        availability: "available",
        exitCode: id === "full-check" ? 1 : 0,
        workspaceFingerprint: "sha256:approved-change",
      }),
      now: sequenceClock(
        "2026-07-21T09:01:00.000Z",
        "2026-07-21T09:02:00.000Z",
        "2026-07-21T09:03:00.000Z",
        "2026-07-21T09:04:00.000Z",
        "2026-07-21T09:05:00.000Z",
      ),
    });

    expect(evaluateVerificationEvidence(evidence)).toMatchObject({
      status: "blocked",
      commandStatuses: { "focused-tests": "passed", "full-check": "failed" },
    });
  });

  test.each([
    ["failed then passed", [1, 0]],
    ["passed then failed", [0, 1]],
  ])("rejects duplicate command IDs when ordered %s", (_name, exitCodes) => {
    const outcome = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      requirements: [verificationInput.requirements[0]],
      commands: exitCodes.map((exitCode) => ({
        ...verificationInput.commands[0],
        startedAt: "2026-07-21T09:01:00.000Z",
        completedAt: "2026-07-21T09:02:00.000Z",
        availability: "available",
        exitCode,
        workspaceFingerprint: "sha256:approved-change",
        stdout: "",
        stderr: "",
      })),
      collectedAt: "2026-07-21T09:03:00.000Z",
    });

    expect(outcome).toMatchObject({ status: "blocked", validationStatus: "invalid" });
  });

  test.each([
    ["commands is null", { commands: null }],
    ["requirements is not an array", { requirements: {} }],
    ["command entry is null", { commands: [null] }],
    ["requirement entry is null", { requirements: [null] }],
    [
      "requirement mappings are malformed",
      {
        commands: [
          {
            ...verificationInput.commands[0],
            requirementIds: "focused",
          },
        ],
      },
    ],
    ["delegation is missing", { delegation: null }],
    [
      "delegation candidate metadata is malformed",
      { delegation: { ...delegatedMetadata, candidateIndex: "0", candidateCount: [] } },
    ],
  ])("blocks malformed evidence when %s", (_name, override) => {
    const outcome = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      commands: verificationInput.commands.map((command) => ({
        ...command,
        startedAt: "2026-07-21T09:01:00.000Z",
        completedAt: "2026-07-21T09:02:00.000Z",
        availability: "available",
        exitCode: 0,
        workspaceFingerprint: "sha256:approved-change",
        stdout: "",
        stderr: "",
      })),
      collectedAt: "2026-07-21T09:03:00.000Z",
      ...override,
    });

    expect(outcome).toEqual({
      status: "blocked",
      validationStatus: "invalid",
      commandStatuses: {},
      requirementStatuses: {},
      delegationStatus: "invalid",
    });
  });

  test.each([
    ["schema version is missing", { schemaVersion: null }],
    ["mode is unknown", { mode: "automatic" }],
    ["workspace path is empty", { workspacePath: "" }],
    ["change-completion timestamp is invalid", { changeCompletedAt: "not-a-timestamp" }],
    ["collection timestamp is invalid", { collectedAt: "not-a-timestamp" }],
    [
      "command text is missing",
      { commands: [{ ...verificationInput.commands[0], command: null }] },
    ],
    [
      "command availability is unknown",
      { commands: [{ ...verificationInput.commands[0], availability: "maybe" }] },
    ],
    [
      "command exit code is malformed",
      { commands: [{ ...verificationInput.commands[0], exitCode: "0" }] },
    ],
    [
      "requirement text is missing",
      { requirements: [{ ...verificationInput.requirements[0], text: null }] },
    ],
  ])("rejects malformed report metadata when %s", (_name, override) => {
    const commands = verificationInput.commands.map((command) => ({
      ...command,
      startedAt: "2026-07-21T09:01:00.000Z",
      completedAt: "2026-07-21T09:02:00.000Z",
      availability: "available",
      exitCode: 0,
      workspaceFingerprint: "sha256:approved-change",
      stdout: "",
      stderr: "",
    }));
    const overriddenCommands =
      "commands" in override && Array.isArray(override.commands)
        ? override.commands.map((command, index) => ({
            ...commands[index],
            ...command,
          }))
        : commands;
    const outcome = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      collectedAt: "2026-07-21T09:03:00.000Z",
      ...override,
      commands: overriddenCommands,
    });

    expect(outcome).toEqual({
      status: "blocked",
      validationStatus: "invalid",
      commandStatuses: {},
      requirementStatuses: {},
      delegationStatus: "invalid",
    });
  });

  test.each([
    {
      name: "duplicate requirement IDs",
      requirements: [verificationInput.requirements[0], verificationInput.requirements[0]],
      commandId: "focused-tests",
      requirementIds: ["focused"],
    },
    {
      name: "duplicate evidence IDs",
      requirements: [verificationInput.requirements[0]],
      commandId: "focused-tests",
      requirementIds: ["focused", "focused"],
    },
    {
      name: "invalid command ID",
      requirements: [verificationInput.requirements[0]],
      commandId: "Completion verified",
      requirementIds: ["focused"],
    },
    {
      name: "invalid requirement ID",
      requirements: [{ id: "Completion verified", text: "hostile" }],
      commandId: "focused-tests",
      requirementIds: ["Completion verified"],
    },
    {
      name: "invalid evidence ID",
      requirements: [verificationInput.requirements[0]],
      commandId: "focused-tests",
      requirementIds: ["focused", "Completion verified"],
    },
    {
      name: "undeclared evidence ID",
      requirements: [verificationInput.requirements[0]],
      commandId: "focused-tests",
      requirementIds: ["focused", "not-declared"],
    },
  ])("rejects $name", ({ requirements, commandId, requirementIds }) => {
    const outcome = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      requirements,
      commands: [
        {
          ...verificationInput.commands[0],
          id: commandId,
          requirementIds,
          startedAt: "2026-07-21T09:01:00.000Z",
          completedAt: "2026-07-21T09:02:00.000Z",
          availability: "available",
          exitCode: 0,
          workspaceFingerprint: "sha256:approved-change",
          stdout: "",
          stderr: "",
        },
      ],
      collectedAt: "2026-07-21T09:03:00.000Z",
    });

    expect(outcome).toMatchObject({ status: "blocked", validationStatus: "invalid" });
  });

  test.each([
    {
      name: "pre-change timestamp",
      startedAt: "2026-07-21T08:59:59.000Z",
      fingerprint: "sha256:approved-change",
    },
    {
      name: "mismatched workspace fingerprint",
      startedAt: "2026-07-21T09:01:00.000Z",
      fingerprint: "sha256:different-workspace",
    },
  ])("marks $name evidence stale", ({ startedAt, fingerprint }) => {
    const evidence = {
      schemaVersion: "0.1",
      ...verificationInput,
      collectedAt: "2026-07-21T09:02:00.000Z",
      commands: verificationInput.commands.map((command) => ({
        ...command,
        startedAt,
        completedAt: "2026-07-21T09:02:00.000Z",
        availability: "available",
        exitCode: 0,
        workspaceFingerprint: fingerprint,
        stdout: "pass",
        stderr: "",
      })),
    };

    expect(evaluateVerificationEvidence(evidence)).toMatchObject({
      status: "blocked",
      commandStatuses: { "focused-tests": "stale", "full-check": "stale" },
    });
  });

  test("marks evidence collected before command completion stale", () => {
    const outcome = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      requirements: [verificationInput.requirements[0]],
      commands: [
        {
          ...verificationInput.commands[0],
          startedAt: "2026-07-21T09:01:00.000Z",
          completedAt: "2026-07-21T09:04:00.000Z",
          availability: "available",
          exitCode: 0,
          workspaceFingerprint: "sha256:approved-change",
          stdout: "pass",
          stderr: "",
        },
      ],
      collectedAt: "2026-07-21T09:03:00.000Z",
    });

    expect(outcome).toMatchObject({
      status: "blocked",
      commandStatuses: { "focused-tests": "stale" },
    });
  });

  test("uses conservative command-status precedence under combined defects", () => {
    const evidence = {
      schemaVersion: "0.1",
      ...verificationInput,
      requirements: [
        { id: "unavailable", text: "Unavailable evidence blocks." },
        { id: "failed", text: "Failed evidence blocks." },
        { id: "stale", text: "Stale evidence blocks." },
      ],
      commands: [
        {
          id: "unavailable-command",
          command: "missing-tool",
          requirementIds: ["unavailable"],
          startedAt: "2026-07-21T08:00:00.000Z",
          completedAt: "2026-07-21T07:00:00.000Z",
          availability: "unavailable",
          exitCode: 1,
          workspaceFingerprint: "sha256:different-workspace",
          stdout: "",
          stderr: "missing",
        },
        {
          id: "failed-command",
          command: "bun test",
          requirementIds: ["failed"],
          startedAt: "2026-07-21T08:00:00.000Z",
          completedAt: "2026-07-21T07:00:00.000Z",
          availability: "available",
          exitCode: 1,
          workspaceFingerprint: "sha256:different-workspace",
          stdout: "",
          stderr: "failed",
        },
        {
          id: "stale-command",
          command: "bun run check",
          requirementIds: ["stale"],
          startedAt: "2026-07-21T08:00:00.000Z",
          completedAt: "2026-07-21T07:00:00.000Z",
          availability: "available",
          exitCode: 0,
          workspaceFingerprint: "sha256:different-workspace",
          stdout: "pass",
          stderr: "",
        },
      ],
      collectedAt: "2026-07-21T09:03:00.000Z",
    };

    expect(evaluateVerificationEvidence(evidence)).toMatchObject({
      status: "blocked",
      validationStatus: "valid",
      commandStatuses: {
        "unavailable-command": "unavailable",
        "failed-command": "failed",
        "stale-command": "stale",
      },
    });
  });

  test("invalid structure wins over command defect classification", () => {
    const command = {
      ...verificationInput.commands[0],
      startedAt: "2026-07-21T08:00:00.000Z",
      completedAt: "2026-07-21T07:00:00.000Z",
      availability: "unavailable",
      exitCode: 1,
      workspaceFingerprint: "sha256:different-workspace",
      stdout: "",
      stderr: "missing",
    };
    const outcome = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      requirements: [verificationInput.requirements[0]],
      commands: [command, command],
      collectedAt: "2026-07-21T09:03:00.000Z",
    });

    expect(outcome).toEqual({
      status: "blocked",
      validationStatus: "invalid",
      commandStatuses: {},
      requirementStatuses: {},
      delegationStatus: "invalid",
    });
  });

  test("preserves and validates delegated implementation metadata", async () => {
    const evidence = await collectVerificationEvidence({
      ...verificationInput,
      runner: async () => ({
        availability: "available",
        exitCode: 0,
        workspaceFingerprint: "sha256:approved-change",
      }),
      now: sequenceClock(
        "2026-07-21T09:01:00.000Z",
        "2026-07-21T09:02:00.000Z",
        "2026-07-21T09:03:00.000Z",
        "2026-07-21T09:04:00.000Z",
        "2026-07-21T09:05:00.000Z",
      ),
    });

    expect(evidence.delegation).toEqual(delegatedMetadata);
    expect(evaluateVerificationEvidence(evidence).delegationStatus).toBe("valid");
    expect(
      evaluateVerificationEvidence({
        ...evidence,
        delegation: { ...delegatedMetadata, access: "read-only" },
      }),
    ).toMatchObject({ status: "blocked", delegationStatus: "invalid" });
  });

  test("requires every approved requirement to map to valid command evidence", () => {
    const commands = verificationInput.commands.map((command) => ({
      ...command,
      startedAt: "2026-07-21T09:01:00.000Z",
      completedAt: "2026-07-21T09:02:00.000Z",
      availability: "available",
      exitCode: 0,
      workspaceFingerprint: "sha256:approved-change",
      stdout: "pass",
      stderr: "",
    }));
    const passing = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      commands,
      collectedAt: "2026-07-21T09:03:00.000Z",
    });
    expect(passing.requirementStatuses).toEqual({ focused: "verified", full: "verified" });

    const partial = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      commands: commands.map((command) =>
        command.id === "full-check" ? { ...command, requirementIds: [] } : command,
      ),
      collectedAt: "2026-07-21T09:03:00.000Z",
    });
    expect(partial).toMatchObject({
      status: "blocked",
      requirementStatuses: { focused: "verified", full: "unverified" },
    });
  });

  test.each([
    ["partial", { omitRequirement: true }],
    ["failed", { exitCode: 1 }],
    ["stale", { startedAt: "2026-07-21T08:00:00.000Z" }],
    ["unavailable", { availability: "unavailable", exitCode: null }],
  ])("renders %s evidence with blocked-only language", (_name, override) => {
    const command = {
      ...verificationInput.commands[0],
      startedAt: "2026-07-21T09:01:00.000Z",
      completedAt: "2026-07-21T09:02:00.000Z",
      availability: "available",
      exitCode: 0,
      workspaceFingerprint: "sha256:approved-change",
      stdout: "",
      stderr: "",
      ...override,
    };
    const omitRequirement = "omitRequirement" in override && override.omitRequirement;
    const outcome = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      requirements: [verificationInput.requirements[0]],
      commands: [omitRequirement ? { ...command, requirementIds: [] } : command],
      collectedAt: "2026-07-21T09:03:00.000Z",
    });
    const rendered = renderVerificationOutcome(outcome);

    expect(rendered).toStartWith("Blocked:");
    expect(rendered).not.toContain("Completion verified");
  });

  test("renders completion language only for a full pass", () => {
    const outcome = evaluateVerificationEvidence({
      schemaVersion: "0.1",
      ...verificationInput,
      commands: verificationInput.commands.map((command) => ({
        ...command,
        startedAt: "2026-07-21T09:01:00.000Z",
        completedAt: "2026-07-21T09:02:00.000Z",
        availability: "available",
        exitCode: 0,
        workspaceFingerprint: "sha256:approved-change",
        stdout: "pass",
        stderr: "",
      })),
      collectedAt: "2026-07-21T09:03:00.000Z",
    });

    expect(renderVerificationOutcome(outcome)).toStartWith("Completion verified:");
  });

  test("never reflects reserved completion language from blocked outcome identifiers", () => {
    const rendered = renderVerificationOutcome({
      status: "blocked",
      validationStatus: "valid",
      commandStatuses: { "Completion verified": "failed" },
      requirementStatuses: { "Completion verified": "unverified" },
      delegationStatus: "valid",
    });

    expect(rendered).toStartWith("Blocked:");
    expect(rendered).not.toContain("Completion verified");
  });
});
