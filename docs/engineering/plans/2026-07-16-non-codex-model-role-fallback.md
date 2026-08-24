# Non-Codex Model-Role Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use mattpocock:subagent-driven-development (recommended) or mattpocock:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow multi-agent bundle installation to generate tier-based, unlabeled non-Codex profiles while preserving Codex model-role routing.

**Architecture:** `planAgentProfiles` derives an effective model role for each assignment-target pair. Only Codex receives the manifest label; every other target selects its existing tier candidates and omits role metadata from instructions and artifacts.

**Tech Stack:** Bun, TypeScript, Zod, Bun Test, Biome

---

## File Structure

- Modify `tests/orchestration.test.ts`: replace the obsolete Claude failure contract with the approved mixed-target behavior.
- Modify `src/runtimes/omniskill/orchestration.ts`: derive and consistently use a target-aware effective model role.

### Task 1: Specify Mixed Codex and Claude Profile Planning

**Files:**
- Test: `tests/orchestration.test.ts:393-423`

- [ ] **Step 1: Replace the failure-expecting test**

Replace `fails closed for labeled Claude profiles` with:

```typescript
test("uses model roles only for Codex profiles", () => {
  const labeled = WorkflowBundleManifestSchema.parse({
    ...manifest,
    orchestration: {
      ...manifest.orchestration,
      roles: {
        ...manifest.orchestration?.roles,
        "catalog:cto": {
          tier: "deep",
          modelRole: "planning",
          access: "read-only",
          consultation: "request",
        },
      },
    },
  });
  const config = createModelRoleOrchestrationConfig({
    config: DEFAULT_ORCHESTRATION_CONFIG,
    selections: {
      planning: { model: "planner", reasoningEffort: "high" },
      implementation: { model: "builder", reasoningEffort: "medium" },
      verification: { model: "verifier", reasoningEffort: "high" },
    },
  });

  const profiles = planAgentProfiles({
    manifest: labeled,
    config,
    homeDir: "/tmp/orchestration-home",
    targets: ["codex", "claude"],
    roleSkillNames,
  });
  const codexProfile = profiles.find(
    ({ source, target }) => source === "catalog:cto" && target === "codex",
  );
  const claudeProfile = profiles.find(
    ({ source, target }) => source === "catalog:cto" && target === "claude",
  );

  expect(codexProfile).toMatchObject({ modelRole: "planning", model: "planner", effort: "high" });
  expect(codexProfile?.instructions).toContain("Model role: planning.");
  expect(claudeProfile).toMatchObject({ model: "opus", effort: "high" });
  expect(claudeProfile).not.toHaveProperty("modelRole");
  expect(claudeProfile?.instructions).not.toContain("Model role:");
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
rtk bun test tests/orchestration.test.ts -t "uses model roles only for Codex profiles"
```

Expected: FAIL with `Model-role routing supports Codex CLI only` while planning the Claude profile.

### Task 2: Derive an Effective Model Role Per Target

**Files:**
- Modify: `src/runtimes/omniskill/orchestration.ts:378-391`
- Modify: `src/runtimes/omniskill/orchestration.ts:485-553`

- [ ] **Step 1: Make candidate selection target-aware**

Replace `assignmentCandidates` with:

```typescript
function assignmentCandidates(input: {
  config: EffectiveOrchestrationConfig;
  assignment: {
    tier: OrchestrationTier;
    modelRole?: ModelRole;
  };
  target: AgentProfileTarget;
}) {
  if (input.target === "codex" && input.assignment.modelRole) {
    return input.config.modelRoles[input.assignment.modelRole].codex;
  }
  return input.config.tiers[input.assignment.tier][input.target];
}
```

- [ ] **Step 2: Use one effective label throughout each target iteration**

At the start of the inner target loop in `planAgentProfiles`, derive the label and pass it to candidate selection:

```typescript
for (const target of input.targets) {
  const modelRole = target === "codex" ? assignment.modelRole : undefined;
  const candidates = assignmentCandidates({
    config,
    assignment: {
      tier: assignment.tier,
      ...(modelRole ? { modelRole } : {}),
    },
    target,
  });
```

In both the `instructions` call and `profiles.push`, replace the assignment-level spread with:

```typescript
...(modelRole ? { modelRole } : {}),
```

Do not change `access`, `consultation`, candidate ordering, destination paths, or rendered profile formats.

- [ ] **Step 3: Run the focused test and confirm GREEN**

```bash
rtk bun test tests/orchestration.test.ts -t "uses model roles only for Codex profiles"
```

Expected: PASS. Codex uses `planner/high`; Claude uses `opus/high` with no role label.

- [ ] **Step 4: Run the minimized real-manifest repro**

```bash
rtk bun -e 'import { readFile } from "node:fs/promises"; import { DEFAULT_ORCHESTRATION_CONFIG, planAgentProfiles, WorkflowBundleManifestSchema } from "./src/runtimes/omniskill/index.ts"; const manifest = WorkflowBundleManifestSchema.parse(JSON.parse(await readFile("examples/teams/startup-team/workflow.json", "utf8"))); const roleSkillNames = Object.fromEntries(Object.keys(manifest.orchestration?.roles ?? {}).map((source, index) => [source, `role-${index}`])); const profiles = planAgentProfiles({ manifest, config: DEFAULT_ORCHESTRATION_CONFIG, homeDir: "/tmp/omniskill-profile-repro", targets: ["claude"], roleSkillNames }); if (profiles.some((profile) => profile.modelRole !== undefined)) throw new Error("Claude profile retained modelRole"); console.log(`planned ${profiles.length} Claude profiles`);'
```

Expected: exits successfully and prints the number of planned Claude profiles.

- [ ] **Step 5: Run focused runtime verification**

```bash
rtk bunx biome check src/runtimes/omniskill/orchestration.ts tests/orchestration.test.ts
rtk bun run typecheck
rtk bun test tests/orchestration.test.ts tests/agent-profile-installer.test.ts tests/workflow-bundles.test.ts
```

Expected: formatting, typecheck, and all focused tests pass.

### Task 3: Verify Installation and Commit Narrowly

**Files:**
- Verify: `examples/teams/startup-team/workflow.json`
- Commit: `src/runtimes/omniskill/orchestration.ts`
- Commit: `tests/orchestration.test.ts`

- [ ] **Step 1: Re-run Startup Team installation planning**

```bash
rtk bun run dev -- install ./examples/teams/startup-team --dry-run
```

Expected: installation planning succeeds; Codex profiles show model-role selections and Claude profiles show tier selections. No files are installed in dry-run mode.

- [ ] **Step 2: Run the repository gate**

```bash
rtk bun run check
```

Expected: Biome, TypeScript, all active tests, and the 90% coverage gate pass.

- [ ] **Step 3: Review the exact implementation diff**

Use the approved design at `docs/engineering/specs/2026-07-16-non-codex-model-role-fallback-design.md`. Confirm there are no standards violations, missing requirements, or changes outside candidate selection, target-aware metadata, and the regression test.

- [ ] **Step 4: Commit only the reviewed hunks**

Because both files were already modified before this task, stage a patch containing only the target-aware fallback and regression-test hunks, inspect `git diff --cached`, then commit:

```bash
rtk git diff --cached --check
rtk git commit -m "fix: allow non-codex model-role fallback"
```

Expected: the commit contains only `src/runtimes/omniskill/orchestration.ts` and `tests/orchestration.test.ts`; all pre-existing worktree changes remain unstaged.
