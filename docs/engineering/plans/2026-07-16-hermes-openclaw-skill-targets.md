# Hermes and OpenClaw Skill Targets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use mattpocock:subagent-driven-development (recommended) or mattpocock:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Hermes and OpenClaw as real, tested Omniskills skill-install and update targets before the landing page advertises them.

**Architecture:** Extend the existing closed `SkillInstallAgent` union and `agentSkillTargets` mapping. Hermes gets its native `~/.hermes/skills` destination; OpenClaw reuses the shared `~/.agents/skills` destination, allowing the existing handled-destination map to deduplicate physical writes while retaining one result per requested agent.

**Tech Stack:** Bun, TypeScript, Commander, Bun test, Biome, Node filesystem APIs.

---

## File Map

| File | Responsibility |
| --- | --- |
| `src/plugins/skill-installer.ts` | Canonical target union, aliases, destination mapping, shared-write deduplication, and support-command copy. |
| `src/cli.ts` | `skills install` and `skills update` target help/defaults. |
| `src/omniskill.ts` | Workflow/team `install --agents` help. |
| `tests/skill-installer.test.ts` | Parser, path, mirror, shared-destination, install, and update behavior. |
| `tests/cli.test.ts` | Public CLI help and dry-run target reporting. |
| `docs/architecture.md` | Durable supported-target filesystem contract. |
| `README.md` | User-facing target list and example. |

### Task 1: Lock The New Target Contract In Tests

**Files:**
- Modify: `tests/skill-installer.test.ts`

- [ ] **Step 1: Expand the canonical all-agent fixture**

Replace the current fixture with:

```ts
const allAgents: SkillInstallAgent[] = [
  "claude",
  "copilot",
  "codex",
  "cursor",
  "hermes",
  "openclaw",
  "opencode",
];
```

- [ ] **Step 2: Extend the parser test**

Replace the parser expectation with:

```ts
test("parses every canonical skill target and existing aliases", () => {
  expect(
    parseSkillInstallAgents(
      "Claude,codex,cursor,opencode,opencodex,hermes,openclaw,github-copilot,GitHub Copilot,githubcopilot",
    ),
  ).toEqual([
    "claude",
    "codex",
    "cursor",
    "opencode",
    "hermes",
    "openclaw",
    "copilot",
  ]);
});
```

- [ ] **Step 3: Replace the all-target install test with the seven-target contract**

Use `agents: allAgents` and assert these destinations:

```ts
expect(result.targets).toEqual([
  expect.objectContaining({
    agent: "claude",
    destination: join(homeDir, ".claude", "skills", "writing-workflow-skills"),
    status: "installed",
  }),
  expect.objectContaining({
    agent: "copilot",
    destination: join(homeDir, ".agents", "skills", "writing-workflow-skills"),
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
    status: "installed",
  }),
  expect.objectContaining({
    agent: "hermes",
    destination: join(homeDir, ".hermes", "skills", "writing-workflow-skills"),
    status: "installed",
  }),
  expect.objectContaining({
    agent: "openclaw",
    destination: join(homeDir, ".agents", "skills", "writing-workflow-skills"),
    status: "installed",
  }),
  expect.objectContaining({
    agent: "opencode",
    destination: join(homeDir, ".agents", "skills", "writing-workflow-skills"),
    status: "installed",
  }),
]);

await expect(
  stat(join(homeDir, ".hermes", "skills", "writing-workflow-skills", "SKILL.md")),
).resolves.toBeTruthy();
```

The status array remains seven `installed` values even though four agents share
one primary destination. The physical write is deduplicated; public results are
not.

- [ ] **Step 4: Add update coverage for the Hermes destination and shared OpenClaw destination**

```ts
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
```

- [ ] **Step 5: Run the focused tests and verify they fail for the intended reason**

Run:

```bash
rtk bun test tests/skill-installer.test.ts
```

Expected: TypeScript/runtime failures because `hermes` and `openclaw` are not
members of `SkillInstallAgent` and have no destination mapping.

- [ ] **Step 6: Commit the failing tests**

```bash
rtk git add tests/skill-installer.test.ts
rtk git commit -m "test: define Hermes and OpenClaw skill targets"
```

### Task 2: Implement Hermes And OpenClaw Destinations

**Files:**
- Modify: `src/plugins/skill-installer.ts`
- Test: `tests/skill-installer.test.ts`

- [ ] **Step 1: Extend the canonical target union**

```ts
export type SkillInstallAgent =
  | "claude"
  | "copilot"
  | "codex"
  | "cursor"
  | "hermes"
  | "openclaw"
  | "opencode";
```

- [ ] **Step 2: Add target paths**

Add these entries to `agentSkillTargets`:

```ts
hermes: { kind: "directory", path: [".hermes", "skills"] },
openclaw: { kind: "directory", path: [".agents", "skills"] },
```

Keep OpenClaw on `.agents/skills` so the existing `handledDestinations` map
deduplicates its physical write with Copilot, Codex, and OpenCode. Do not add an
OpenClaw mirror.

- [ ] **Step 3: Extend validation and support copy**

Update `isSkillInstallAgent`:

```ts
function isSkillInstallAgent(agent: string): agent is SkillInstallAgent {
  return (
    agent === "claude" ||
    agent === "copilot" ||
    agent === "codex" ||
    agent === "cursor" ||
    agent === "hermes" ||
    agent === "openclaw" ||
    agent === "opencode"
  );
}
```

Update the recovery command:

```ts
return `omniskill skills install ${source} --agents codex,claude,cursor,copilot,hermes,openclaw,opencode --home ~`;
```

- [ ] **Step 4: Run the focused test**

```bash
rtk bun test tests/skill-installer.test.ts
```

Expected: PASS, including Hermes native-path writes and shared OpenClaw
destination behavior.

- [ ] **Step 5: Run typecheck**

```bash
rtk bun run typecheck
```

Expected: PASS; `agentSkillTargets` contains one mapping for every
`SkillInstallAgent` member.

- [ ] **Step 6: Commit the implementation**

```bash
rtk git add src/plugins/skill-installer.ts
rtk git commit -m "feat: support Hermes and OpenClaw skills"
```

### Task 3: Expose The Targets In Public CLI Help

**Files:**
- Modify: `tests/cli.test.ts`
- Modify: `src/cli.ts`
- Modify: `src/omniskill.ts`

- [ ] **Step 1: Strengthen CLI help assertions**

In the `skills help advertises supported targets` test, require:

```ts
expect(help).toContain("claude,copilot,codex,cursor,hermes,openclaw,opencode");
expect(help).toContain("github-copilot");
expect(help).toContain("opencodex");
```

In the Omniskills install help test, require:

```ts
expect(help).toContain(
  "codex,claude,cursor,copilot,hermes,openclaw,opencode",
);
```

- [ ] **Step 2: Add a dry-run CLI test**

```ts
test("skills install dry-runs Hermes and OpenClaw destinations", async () => {
  const homeDir = await mkdtemp(join(tmpdir(), "omniskill-cli-home-"));
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...values: unknown[]) => {
    logs.push(values.join(" "));
  };
  try {
    await buildProgram({ cwd: homeDir }).parseAsync(
      [
        "skills",
        "install",
        "writing-workflow-skills",
        "--agents",
        "hermes,openclaw",
        "--home",
        homeDir,
        "--dry-run",
      ],
      { from: "user" },
    );
    expect(logs.some((line) => line.includes("hermes: would install"))).toBe(true);
    expect(logs.some((line) => line.includes("openclaw: would install"))).toBe(true);
  } finally {
    console.log = originalLog;
    await rm(homeDir, { recursive: true, force: true });
  }
});
```

Use the existing `buildProgram` and `console.log` capture pattern already
present in the file; do not introduce a second CLI harness.

- [ ] **Step 3: Run the CLI tests and observe the help failure**

```bash
rtk bun test tests/cli.test.ts
```

Expected: FAIL because the help strings do not yet name Hermes and OpenClaw.

- [ ] **Step 4: Update `skills install/update` help and defaults**

In `src/cli.ts`:

```ts
.option(
  "-a, --agents <agents>",
  "comma-separated targets: claude,copilot,codex,cursor,hermes,openclaw,opencode (aliases: github-copilot,opencodex)",
  "claude,copilot,codex,cursor,hermes,openclaw,opencode",
)
```

- [ ] **Step 5: Update workflow/team install help without broadening its default**

In `src/omniskill.ts`:

```ts
.option(
  "--agents <agents>",
  "comma-separated skill install targets: codex,claude,cursor,copilot,hermes,openclaw,opencode (aliases: github-copilot,opencodex)",
  "codex,claude,cursor",
)
```

Keep the workflow/team default at `codex,claude,cursor`. Adding support does not
authorize writing into every agent home by default.

- [ ] **Step 6: Run focused CLI tests**

```bash
rtk bun test tests/cli.test.ts tests/skill-installer.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the CLI surface**

```bash
rtk git add tests/cli.test.ts src/cli.ts src/omniskill.ts
rtk git commit -m "feat: expose Hermes and OpenClaw targets"
```

### Task 4: Align Documentation And Verify The Runtime Slice

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: Update the durable target list**

In `docs/architecture.md`, document:

```markdown
- Hermes: `.hermes/skills`
- OpenClaw: `.agents/skills`
```

Also state that OpenClaw shares its primary path with Codex, OpenCode, and
GitHub Copilot, so one operation writes that destination once.

- [ ] **Step 2: Update the README example**

Use this exact example:

```bash
npx omniskill@latest skills install writing-workflow-skills \
  --agents codex,claude,cursor,copilot,hermes,openclaw,opencode
```

Describe these as skill-install targets. Do not imply that all seven have native
verified-dispatch adapters.

- [ ] **Step 3: Run documentation and focused tests**

```bash
rtk bun test tests/readme.test.ts tests/cli.test.ts tests/skill-installer.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run a scratch dry-run smoke**

```bash
rtk bun run dev -- skills install writing-workflow-skills --agents hermes,openclaw --home work/hermes-openclaw-smoke --dry-run
```

Expected output includes:

```text
hermes: would install
openclaw: would install
```

and the planned paths end in:

```text
.hermes/skills/writing-workflow-skills
.agents/skills/writing-workflow-skills
```

- [ ] **Step 5: Run the full repository gate**

```bash
rtk bun run check
```

Expected: PASS with at least 90% line coverage.

- [ ] **Step 6: Commit documentation**

```bash
rtk git add README.md docs/architecture.md
rtk git commit -m "docs: document Hermes and OpenClaw targets"
```

## Completion Evidence

Record in the handoff:

- focused test commands and pass counts;
- the dry-run destination output;
- the full `rtk bun run check` result;
- exact files committed;
- confirmation that workflow/team install defaults remain
  `codex,claude,cursor`;
- confirmation that no non-Codex verified-dispatch claim was added.
