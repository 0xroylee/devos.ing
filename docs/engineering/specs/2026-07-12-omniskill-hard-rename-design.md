# Omniskill Hard Rename Design

## Objective

Make the product brand **Omniskills** while making the npm package, executable,
and command invocation singular: `omniskill` and `npx omniskill`. Remove every
legacy package, binary, environment, and storage compatibility surface. Write
all new runtime state to `.omniskills` without fallback reads or data migration.

## Approved Naming Contract

| Surface | Canonical name |
| --- | --- |
| Product and prose brand | `Omniskills` |
| npm package | `omniskill` |
| CLI executable | `omniskill` |
| npx invocation | `npx omniskill <command>` |
| Workflow records | `~/.omniskills/workflows/` |
| Loop runs | `~/.omniskills/runs/<workflow>/<run-id>/` |
| Binary override | `OMNISKILL_BIN` |
| Internal command module/runtime folder | `src/omniskill.ts`, `src/runtimes/omniskill/` |

The legacy package, binary, binary override, state directory, and plural command
invocation are removed rather than deprecated. Documentation must not direct
users to any removed identifier.

## Compatibility Boundary

This is an intentional hard break. The runtime will not:

- register old executable aliases;
- read workflow records, loop state, or snapshots from the legacy state root;
- migrate legacy state into `.omniskills`;
- honor either removed binary override;
- document recovery through old commands.

Existing installations must reinstall the singular `omniskill` package. Users
who need old state must move it themselves; this repository will not ship a
migration command in this change.

## Package and CLI

`package.json` will publish the package as `omniskill` and expose only the
`omniskill` binary. Commander will render `omniskill` in root and subcommand
help. All generated next-step instructions, errors, skill guidance, scripts,
examples, and smoke checks will use the singular executable.

Generated loop runners will invoke `omniskill` by default and accept only the
`OMNISKILL_BIN` environment override. Their missing-CLI and termination errors
will name the singular executable.

The product remains grammatically plural in prose: “Omniskills installs a
workflow,” “an Omniskills workflow,” and the `OMNISKILLS` display logo remain
valid brand language. Only executable/package/config identifiers become
singular.

## Runtime Storage

All active and retained runtime code will use `.omniskills`:

- workflow install records: `.omniskills/workflows`;
- goal-loop state: `.omniskills/runs`;
- Pony Trail snapshot history and stored copies: `.omniskills`;
- sandbox evaluation fixtures and smoke-test paths: `.omniskills`.

CLI options that describe an override directory will name `.omniskills` in help
text. Ignore rules, bundled skill instructions, tests, and architecture docs
will match the new storage root.

No runtime branch may fall back to the legacy state root. Old data is
intentionally invisible after the change.

## Repository Migration Surface

The implementation will update all repository-owned active and retained files,
including:

- package metadata and CLI registration;
- Omniskill and retained Pony Trail runtime modules;
- generated-runner templates and environment variables;
- bundled skills and helper scripts;
- English and Traditional Chinese READMEs and guides;
- landing content, components, and design documentation;
- workflow examples and authoring guidance;
- CI workflows, smoke scripts, Biome ignores, and AGENTS instructions;
- fixtures, snapshots, and assertions across the test suite.

The worktree already contains unrelated or concurrent landing, documentation,
test, and deployment edits. Implementation must use those working-tree files as
the base, preserve their intent, and avoid broad replacement that overwrites
them. Files may be changed only when their naming content genuinely belongs to
this migration.

## Error and User Experience

After release:

- `npx omniskill --help` is the supported entry point;
- removed package and binary aliases fail normally because they no longer exist;
- errors and remediation text point only to `npx omniskill` or `omniskill` on
  `PATH`;
- existing legacy state is not listed, removed, or resumed;
- new workflow and loop state is written only under `.omniskills`.

The CLI command set and workflow behavior otherwise remain unchanged.

## Verification Contract

Tests must prove:

1. The package name and sole binary are `omniskill`.
2. CLI help, output, next steps, and errors render the singular executable.
3. Workflow records and loop runs use `.omniskills` exclusively.
4. Snapshot tooling uses `.omniskills` exclusively.
5. Generated loop runners use `omniskill` and `OMNISKILL_BIN` only.
6. Public docs, landing content, examples, and guides use `npx omniskill`.
7. Runtime, package, documentation, tests, CI, landing, bundled skills, and
   examples contain no removed package, binary, environment, state-directory,
   or plural-command identifiers. Git history and third-party dependency
   material are outside the scan.
8. Product prose still uses the approved plural “Omniskills” brand.

Verification will include focused package, CLI, workflow, loop, snapshot,
README, landing, and CI tests; CLI smoke checks; repository-wide legacy-name
scans; `rtk bun test`; and the required `rtk bun run check` gate.

## Release Boundary

This change updates the repository but does not:

- publish the renamed npm package;
- deploy the landing site;
- migrate user data;
- retain or introduce a compatibility shim;
- commit unrelated worktree changes solely because they are already present.

Publishing and deployment require separate explicit authorization after the
implementation is verified.
