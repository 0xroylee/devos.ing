# Tasks

## 1. Proposal Review

- [x] Inspect current workflow manifest, entry skill, role skills, README,
      AGENTS guidance, landing content, and tests.
- [x] Create this OpenSpec proposal, spec delta, and task handoff.
- [x] Review `proposal.md` scope with the human owner.
- [x] Confirm the canonical public alias should be `startup-goal`.
- [x] Confirm that the CLI should not add a live subagent runtime in this
      change; the contract belongs in the role workflow skill instructions.

## 2. Brainstorm Design

- [x] Present 2-3 rename and compatibility approaches with trade-offs.
- [x] Confirm whether `startup-team` should become unsupported, remain as a
      compatibility alias, or remain only in historical docs.
- [x] Confirm how explicit the role-subagent prompt template should be in the
      entry skill.
- [x] Write the approved design to `docs/engineering/specs/`.
- [x] Re-review the approved design for stale command names, accidental role
      renames, and misleading runtime claims.

## 3. Plan Implementation

- [x] Confirm public test seams for the TDD pass:
      `loadWorkflowBundle`, README source-contract tests, and landing
      source-contract tests.
- [x] Write an implementation plan in `docs/engineering/plans/`.
- [x] Include TDD slices for curated workflow loading, entry skill rename,
      lock-file alignment, README/docs commands, landing content, and
      role-subagent instruction behavior.

## 4. Implement With TDD

- [x] Add failing tests proving curated workflow examples include
      `startup-goal`.
- [x] Add failing README tests for `startup-goal` install and invocation
      commands.
- [x] Add failing landing tests for Startup Goal registry content, source links,
      and install commands.
- [x] Add or update a test that reads the entry skill and checks the role
      subagent dispatch contract.
- [x] Rename the example workflow directory and entry skill directory.
- [x] Update `workflow.json` and `workflow.lock.json`.
- [x] Update README, AGENTS guidance, workflow author guide, landing content,
      and active source-contract tests.
- [x] Keep historical OpenSpec change records intact.

## 5. Verify And Archive

- [x] Run `rtk bun test tests/workflow-bundles.test.ts tests/readme.test.ts
      tests/landing-app.test.ts`.
- [x] Run `rtk bun run dev -- deps examples/workflows/startup-goal`.
- [x] Run `rtk bun run dev -- validate examples/workflows/startup-goal`.
- [x] Run `rtk bun run dev -- install examples/workflows/startup-goal --dir
      work/startup-goal-install-smoke`.
- [x] Run `rtk bun run check`.
- [x] Record Pony Trail post-change evidence.
- [ ] Run `/opsx:archive` after human approval and verified delivery.
