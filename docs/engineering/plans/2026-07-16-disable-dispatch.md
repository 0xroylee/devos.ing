# Disable CLI Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use mattpocock:subagent-driven-development (recommended) or mattpocock:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every public CLI route to orchestration dispatch while preserving workflow and team bundle behavior and the dormant dispatch implementation.

**Architecture:** The normal Omniskills command registrar stops attaching `dispatch`. The dormant command registrar remains private and its legacy command-level integration tests stay skipped for rollback; planner, dispatcher, and run-store suites remain active. Bundle commands, schemas, profiles, stored runs, and model-routing setup remain unchanged.

**Tech Stack:** Bun, TypeScript, Commander, Bun Test, Biome

---

## File Structure

- Modify `src/omniskill.ts`: remove dispatch from normal command registration and keep the dormant registrar private.
- Modify `tests/cli.test.ts`: specify the packaged CLI command tree and root-parser rejection behavior.
- Modify `tests/omniskill.test.ts`: specify the reusable Omniskills command tree and retain legacy command-level dispatch tests as skipped rollback cases.
- Modify `docs/architecture.md`: mark dispatch as temporarily disabled without removing the dormant runtime map.

### Task 1: Specify the Disabled Public CLI Boundary

**Files:**
- Modify: `tests/cli.test.ts:126-190`
- Modify: `tests/omniskill.test.ts:490-540`

- [ ] **Step 1: Remove `dispatch` from both expected public command lists**

In `tests/cli.test.ts`, change the root list to:

```typescript
expect(program.commands.map((command) => command.name())).toEqual([
  "init",
  "validate",
  "lock",
  "install",
  "list",
  "remove",
  "deps",
  "onboard",
  "setup-model-routing",
  "loop",
  "bundle",
  "workflow",
  "skills",
]);
expect(program.commands.some((command) => command.name() === "dispatch")).toBe(false);
```

Make the equivalent removal and negative assertion in the `registers Omniskills commands and dependency aliases` test in `tests/omniskill.test.ts`.

- [ ] **Step 2: Add an execution-boundary regression test**

Add this test beside the root registration test in `tests/cli.test.ts`:

```typescript
test("rejects dispatch before any orchestration execution path is available", async () => {
  const program = buildProgram();
  program.exitOverride();
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });

  await expect(program.parseAsync(["dispatch"], { from: "user" })).rejects.toMatchObject({
    code: "commander.excessArguments",
  });
});
```

- [ ] **Step 3: Run the public-boundary tests and confirm RED**

Run:

```bash
rtk bun test tests/cli.test.ts tests/omniskill.test.ts
```

Expected: the command-list assertions fail because `dispatch` is still registered, and the new parsing test reaches dispatch instead of receiving `commander.excessArguments`.

### Task 2: Unregister Dispatch and Keep the Dormant Seam Private

**Files:**
- Modify: `src/omniskill.ts:304-318`
- Modify: `src/omniskill.ts:400-600`
- Modify: `tests/omniskill.test.ts:725-1800`

- [ ] **Step 1: Remove dispatch from normal command registration**

Change `configureOmniskillCommands` to omit the dispatch registrar:

```typescript
function configureOmniskillCommands(
  command: Command,
  options: ConfigureOmniskillCommandOptions,
): void {
  configureAuthorCommands(command, options);
  configureLockCommand(command, options);
  configureInstallCommand(command, options);
  configureListCommand(command, options.rootDir);
  configureRemoveCommand(command, options);
  configureDependencyCommand(command, options);
  configureOnboardCommand(command, options);
  configureModelRoutingCommand(command, options);
  configureLoopCommand(command, options);
}
```

- [ ] **Step 2: Mark the private command registrar as intentionally dormant**

Rename the existing private function; do not export or change its implementation:

```typescript
function _configureDispatchCommand(
  command: Command,
  options: ConfigureOmniskillCommandOptions,
): void {
```

The underscore records that the local is intentionally unused while keeping the module interface unchanged.

- [ ] **Step 3: Keep legacy command-level integrations as rollback cases**

Add one comment before the legacy dispatch block and change its ten `test(...)` declarations to `test.skip(...)`:

```typescript
// Retained for rollback while the public dispatch command remains disabled.
test.skip("dispatch dry-run prints a verified plan without launching or writing run state", async () => {
```

Apply `test.skip` to these cases:

- `dispatch dry-run prints a verified plan without launching or writing run state`
- `dispatch executes a verified profile and persists its receipt`
- `dispatch retries each candidate and records ordered fallback attempts`
- `dispatch does not retry an arbitrary runtime failure`
- `dispatch fails closed after exhausting configured candidate attempts`
- `dispatch preserves a terminal runtime failure after model fallbacks`
- `dispatch resume re-verifies and continues a suspended Codex session`
- `dispatch resume bounds reassignment and repeated consultations`
- `dispatch resume makes human escalation terminal`
- `dispatch resume rejects profile drift before contacting Codex`

Keep the dedicated planner, dispatcher, and run-store tests active. Re-enable
these command-level cases only after a bounded-memory regression covers launch
and resume.

- [ ] **Step 5: Run the focused suite and confirm GREEN**

Run:

```bash
rtk bun test tests/cli.test.ts tests/omniskill.test.ts
```

Expected: all active focused tests pass and the ten legacy command-level cases are reported as intentionally skipped. The public programs reject dispatch, while dedicated runtime suites retain active behavior coverage.

- [ ] **Step 6: Commit the behavior change narrowly**

```bash
rtk git add src/omniskill.ts tests/cli.test.ts tests/omniskill.test.ts
rtk git diff --cached --check
rtk git commit -m "fix: disable orchestration dispatch command"
```

Expected: the commit contains only the three listed files.

### Task 3: Document the Temporary Disable Switch

**Files:**
- Modify: `docs/architecture.md:29-45`
- Modify: `docs/architecture.md:134-145`
- Modify: `docs/architecture.md:158-162`

- [ ] **Step 1: Remove dispatch from the available-command list**

Delete these two bullets:

```markdown
- `omniskill dispatch <workflow-name> --role <source> --task <text>`
- `omniskill dispatch resume <run-id> --decision <decision> --message <text>`
```

- [ ] **Step 2: Add the explicit availability note**

Insert after the primary command list:

```markdown
Orchestration dispatch is temporarily disabled at CLI registration because the
execution path can cause increasing memory usage. Workflow and team bundles,
profile metadata, and `setup-model-routing` remain available. Existing dispatch
run files are preserved but cannot be started or resumed through the CLI.
```

- [ ] **Step 3: Describe dispatch modules as dormant**

Replace the active-runtime paragraph with:

```markdown
`src/runtimes/omniskill/orchestration-dispatch.ts`,
`src/plugins/orchestration-dispatcher.ts`, and
`src/plugins/orchestration-run-store.ts` retain the verified planning,
adapter, and persisted-run implementation for rollback and diagnosis. They are
dormant because the public command registrar does not attach `dispatch` or
`dispatch resume`. `src/omniskill.ts` remains the CLI boundary that controls
availability.
```

Replace the `Runtime State` paragraph with:

```markdown
Installed workflow records live under
`~/.omniskills/workflows/`; project-local records are only written when a
caller passes `--dir`. Optional looped workflows may write per-run state under
`~/.omniskills/runs/<workflow>/<run-id>/` through `omniskill loop` or the
compatibility `loop.mjs` wrapper. Dispatch run directories from older versions
may contain `request.json`, `plan.json`, `attempts.jsonl`, and `receipt.json`,
but the current CLI cannot create or resume them.
```

- [ ] **Step 4: Verify documentation consistency**

Run:

```bash
rtk rg -n "omniskill dispatch|temporarily disabled|dormant" docs/architecture.md
rtk git diff --check -- docs/architecture.md
```

Expected: there are no available-command examples for `omniskill dispatch`; the temporary-disable and dormant-runtime statements are present; `git diff --check` exits successfully.

- [ ] **Step 5: Commit the documentation narrowly**

```bash
rtk git add docs/architecture.md
rtk git diff --cached --check
rtk git commit -m "docs: mark orchestration dispatch disabled"
```

Expected: the commit contains only `docs/architecture.md`.

### Task 4: Verify Bundles Remain Available and Dispatch Remains Unavailable

**Files:**
- Verify only; no planned file changes.

- [ ] **Step 1: Run the focused CLI tests**

```bash
rtk bun test tests/cli.test.ts tests/omniskill.test.ts tests/orchestration-dispatch.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Smoke-test the packaged public command tree**

```bash
rtk bun run dev -- --help
```

Expected: help lists bundle commands and `setup-model-routing`, but does not list `dispatch`.

```bash
rtk bun run dev -- dispatch startup-team --role catalog:cto --task Review
```

Expected: exits nonzero with a Commander parse error before a run directory or child process is created.

- [ ] **Step 3: Smoke-test the preserved bundle surface**

```bash
rtk bun run dev -- validate examples/teams/startup-team
rtk bun run dev -- deps examples/teams/startup-team
```

Expected: validation succeeds and dependency resolution prints the startup-team skill tree.

- [ ] **Step 4: Run the full repository gate**

```bash
rtk bun run check
```

Expected: Biome, TypeScript, all tests, and the 90% line-coverage gate pass.

- [ ] **Step 5: Inspect final scope**

```bash
rtk git status --short
rtk git log -3 --oneline
```

Expected: the two implementation commits appear after the design and plan commits. Pre-existing unrelated worktree changes remain unstaged and unmodified.
