# Remove Workflow Skills By Name Design

## Goal

Add a safe Omniskills command that removes the skills installed for a named
workflow:

```bash
omniskill remove <workflow-name>
omniskill workflow remove <workflow-name>
```

The command should clean up workflow-installed skill artifacts without guessing
paths, deleting shared skills, or touching unrelated user state.

## Approved Decision

Use record-driven removal with a legacy fallback.

The install command will persist exact artifact metadata in the workflow record.
The remove command will use that metadata as the source of truth, compare it
with other installed workflow records, delete only artifacts that are safe to
remove, and then delete the named workflow record.

Older workflow records that do not have removal metadata will use a plain
inferred fallback for safely mappable skill names. Unmappable sources are
skipped with an explanation.

## Command Surface

Root command:

```bash
omniskill remove <workflow-name> [--home <dir>] [--dir <dir>] [--dry-run] [--yes]
```

Compatibility command:

```bash
omniskill workflow remove <workflow-name> [--home <dir>] [--dir <dir>] [--dry-run] [--yes]
```

`--home` and `--dir` follow the existing install/list contract:

- default record root is `<home>/.omniskills/workflows`;
- `--dir` explicitly switches the record root to
  `<dir>/.omniskills/workflows`;
- skill artifact paths come from the workflow record, not from the record root.

`--dry-run` prints the removal plan and deletes nothing.

`--yes` confirms the plan for non-interactive tests and automation.

## Data Model

Extend installed workflow records with removal metadata:

```ts
interface InstalledWorkflowSkillArtifact {
  source: string;
  skillName: string;
  agent: "claude" | "copilot" | "codex" | "cursor" | "opencode";
  status: SkillInstallStatus;
  paths: string[];
}
```

Each artifact entry records one manifest skill source, the resolved installed
skill name, the normalized agent target, install status, and every artifact path
written for that target.

`paths` includes mirrors. For Codex, that means both the shared
`.agents/skills/<skill>` target and the `.codex/skills/<skill>` mirror.

Install statuses that did not write or refresh files, such as `skipped_exists`
or `already_present`, should still be recorded as context but should not become
blind delete candidates unless the artifact path is also referenced by the
workflow's install metadata as an installed or updated artifact.

## Runtime Boundaries

`src/omniskill.ts` stays the command wiring layer. It should parse options,
print plans, ask for confirmation, and call runtime helpers.

`src/runtimes/omniskill/workflow-bundles.ts` owns workflow records:

- write install records with artifact metadata;
- load one installed workflow by name;
- list other installed workflow records from the same root;
- build a removal plan;
- remove the workflow record after successful non-dry removal.

`src/plugins/skill-installer.ts` owns installed artifact knowledge:

- expose all artifact paths written for a target, including mirrors;
- keep source resolution and destination layout inside the plugin seam;
- avoid making the command layer reconstruct agent-specific paths.

The remove command should delete paths through a small runtime helper rather
than spreading filesystem deletion logic through CLI actions.

## Removal Flow

1. Resolve `homeDir` from `--home`.
2. Resolve `recordRoot` from `--dir` or `homeDir`.
3. Load `<recordRoot>/.omniskills/workflows/<workflow-name>.json`.
4. Build a candidate artifact list from the workflow record.
5. Load every other workflow record in the same record root.
6. Mark candidate paths as kept when another record references the same path.
7. Print the plan:
   - workflow record path;
   - paths to remove;
   - paths kept because another workflow uses them;
   - skipped legacy sources, if any.
8. Stop without mutation on `--dry-run`.
9. Ask for confirmation unless `--yes` is supplied.
10. Delete removable artifact files/directories.
11. Delete the named workflow record.

Missing workflow records fail before any deletion with:

```text
Omniskills is not installed: <workflow-name>
```

## Shared Artifact Rules

Shared artifacts are protected by path equality across installed workflow
records in the same record root.

If `release-review` and `ops-review` both reference
`<home>/.agents/skills/pony-trail`, removing `release-review` keeps that path
and explains that `ops-review` still uses it.

The protection is path-based because some workflows may refer to the same
installed artifact through different original manifest sources.

## Legacy Fallback

Legacy records without artifact metadata use inferred skill names only when the
mapping is safe:

- local skill path source such as `./skills/release-risk-review` maps to
  `release-risk-review`;
- known Matt Pocock source such as `mattpocock:grilling` maps to the
  installed skill name `grilling`;
- known Matt Pocock source such as `mattpocock:tdd` maps to `tdd`;
- bundled skill source names map to that bundled name or known alias.

The inferred plan should print that it is inferred from a legacy record.

Unknown git or package-style sources are skipped. The command should explain the
skip instead of deriving paths from an unsafe guess.

## User-Facing Output

Plain output is enough:

```text
Omniskills remove plan: release-review
Workflow record: <home>/.omniskills/workflows/release-review.json
Artifacts to remove:
- <home>/.agents/skills/release-risk-review
Artifacts kept:
- <home>/.agents/skills/pony-trail (still used by ops-review)
```

Success output should name the removed workflow:

```text
Omniskills removed: release-review
```

Dry-run output should use "would remove" language and leave the workflow record
in place.

## Testing Seams

Use behavior tests at public seams:

- command registration in `tests/omniskill.test.ts` and `tests/cli.test.ts`;
- workflow record helpers in `tests/workflow-bundles.test.ts`;
- artifact metadata from the skill installer in `tests/skill-installer.test.ts`;
- end-to-end CLI behavior with scratch `rootDir` and `homeDir`.

Core scenarios:

- install writes artifact metadata, including Codex mirror paths;
- `remove --dry-run` prints a plan and deletes nothing;
- `remove --yes` deletes removable artifacts and the workflow record;
- `workflow remove --yes` behaves like root `remove`;
- missing workflow fails before deletion;
- shared artifacts are preserved;
- legacy records produce an explicit inferred plan;
- unmappable legacy sources are skipped.

## Verification

Focused checks:

```bash
rtk bun test tests/skill-installer.test.ts
rtk bun test tests/workflow-bundles.test.ts
rtk bun test tests/omniskill.test.ts
rtk bun test tests/cli.test.ts
rtk openspec validate remove-workflow-skills-by-name --strict
```

Final checks:

```bash
rtk bun run check
```

Smoke check in `work/`:

```bash
rtk bun run dev -- install examples/workflows/release-review --home work/remove-smoke-home
rtk bun run dev -- remove release-review --home work/remove-smoke-home --dry-run
rtk bun run dev -- remove release-review --home work/remove-smoke-home --yes
rtk bun run dev -- list --home work/remove-smoke-home
```

The smoke should prove the record is gone and the removed workflow no longer
appears in `list`.

## Risks

The main risk is deleting a skill that another workflow still needs. The
mitigation is record-driven path comparison before deletion.

The second risk is older records without metadata. The mitigation is explicit
legacy fallback output and skipping any source that cannot be mapped safely.

The third risk is command-layer path reconstruction drifting from installer
behavior. The mitigation is to expose artifact paths from the installer result
and store them in the workflow record.

## Self-Review

- Placeholder scan: no placeholder markers or unfinished sections remain.
- Consistency check: the design matches the approved record-driven approach,
  root-first command surface, global-home default, and compatibility workflow
  alias.
- Scope check: the design is limited to removing workflow-installed skill
  artifacts and records. It does not remove external Skills CLI packages, loop
  state, or Pony Trail snapshots.
- Ambiguity check: command options, data ownership, shared-artifact protection,
  legacy fallback, tests, and verification commands are explicit.
