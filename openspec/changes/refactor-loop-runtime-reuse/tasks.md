# Tasks

## 1. Proposal Approval

- [x] Create OpenSpec proposal, spec delta, and task checklist.
- [x] Review reusable loop runtime scope with the human owner.
- [x] Decide where the shared Node runtime asset should live.
- [x] Decide whether install copies the shared runtime asset automatically or
      declares it in manifest metadata.
- [x] Decide whether a `omniskill loop` adapter belongs in v1 or should be
      deferred.
- [x] Decide whether the active internal `ponytrail` runtime namespace should
      be renamed as part of this refactor.

## 2. Brainstorm Design

- [x] Explore 2-3 reusable runtime approaches with trade-offs.
- [x] Confirm the recommended design with the human owner.
- [x] Save the approved design to `docs/engineering/specs/`.
- [x] Re-review the written design for placeholders, contradictions, and scope
      creep.

## 3. Plan Implementation

- [x] Write the implementation plan in `docs/engineering/plans/`.
- [x] Include TDD slices for the runtime entrypoint, wrapper behavior,
      install-time copied files, non-loop workflow compatibility, and docs.

## 4. Implement With TDD

- [x] Confirm the public seams under test before writing tests.
- [x] Add a failing runtime-level test for command execution through the shared
      entrypoint.
- [x] Extract the generic runtime behavior behind the shared entrypoint.
- [x] Move active runtime modules from `src/runtimes/ponytrail/` to
      `src/runtimes/omniskill/` and update imports.
- [x] Add a failing Node wrapper smoke test for the thin example `loop.mjs`.
- [x] Reduce the example `loop.mjs` to the thin wrapper.
- [x] Add a failing install-preparation test for copied shared runtime assets.
- [x] Update install preparation to copy the shared runtime asset for looped
      workflows.
- [x] Add compatibility coverage for non-loop workflows.
- [x] Update author documentation.

## 5. Verify And Archive

- [x] Run focused Bun tests for loop runtime and workflow-bundle installation.
      Evidence: `rtk bun test tests/workflow-bundles.test.ts
      tests/loop-runtime.test.ts tests/cli.test.ts`.
- [x] Run Node smoke checks against the example workflow loop.
      Evidence: `rtk env HOME=/private/tmp/omniskill-loop-smoke-20260706-1409
      node examples/workflows/grilled-product-dev/loop.mjs start --run
      plan-smoke --json` and matching `status --run plan-smoke --json`.
- [x] Run CLI validate/deps smoke checks for the example workflow.
      Evidence: `rtk bun run dev -- validate
      examples/workflows/grilled-product-dev` and `rtk bun run dev -- deps
      examples/workflows/grilled-product-dev`.
- [x] Run `rtk bun run check`.
      Evidence: 137 tests passed, coverage passed at 91.88% lines
      (3305/3597).
- [x] Record Pony Trail post-change evidence.
      Evidence: snapshots `20260706T141040Z-197c6700`,
      `20260706T141310Z-815d9c02`, and `20260706T141452Z-68acc8ad`.
- [ ] Run `/opsx:archive` after human approval.
