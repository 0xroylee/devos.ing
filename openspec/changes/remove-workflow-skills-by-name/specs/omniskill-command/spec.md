# Omniskill Remove Command Spec

## ADDED Requirements

### Requirement: Remove Workflow Skills By Name

The CLI SHALL provide a command that removes the skill artifacts installed for a
named Omniskill workflow.

#### Scenario: user removes an installed workflow

- **GIVEN** a workflow record exists at
  `<home>/.omniskill/workflows/release-review.json`
- **AND** the record contains skill artifact metadata from installation
- **WHEN** a user runs
  `omniskill remove release-review --home <home> --yes`
- **THEN** the CLI deletes the removable recorded skill artifacts
- **AND** the CLI deletes
  `<home>/.omniskill/workflows/release-review.json`
- **AND** the output names the workflow and each removed artifact path

#### Scenario: user removes through the compatibility workflow command

- **GIVEN** a workflow record exists at
  `<home>/.omniskill/workflows/release-review.json`
- **WHEN** a user runs
  `omniskill workflow remove release-review --home <home> --yes`
- **THEN** the command behaves the same as
  `omniskill remove release-review --home <home> --yes`

### Requirement: Remove Uses The Same Record Root Defaults As Install And List

The remove command SHALL read installed workflow records from the global home by
default and SHALL only use a project-local record root when `--dir` is supplied.

#### Scenario: remove reads global records by default

- **GIVEN** a workflow record exists at
  `<home>/.omniskill/workflows/release-review.json`
- **WHEN** a user runs `omniskill remove release-review --home <home> --yes`
- **THEN** the CLI reads the record from `<home>`
- **AND** the CLI does not require `--dir`

#### Scenario: remove reads project-local records when dir is supplied

- **GIVEN** a workflow record exists at
  `<project>/.omniskill/workflows/release-review.json`
- **WHEN** a user runs
  `omniskill remove release-review --dir <project> --home <home> --yes`
- **THEN** the CLI reads the record from `<project>`
- **AND** skill artifact paths are still interpreted from the workflow record,
  not guessed from `<project>`

### Requirement: Removal Plan Can Be Previewed

The remove command SHALL support a dry-run mode that prints the planned changes
without deleting files.

#### Scenario: user previews workflow removal

- **GIVEN** a workflow record exists with removable skill artifact metadata
- **WHEN** a user runs `omniskill remove release-review --home <home> --dry-run`
- **THEN** the CLI prints the workflow record path
- **AND** the CLI prints each artifact path that would be removed
- **AND** the CLI does not delete skill artifacts
- **AND** the CLI does not delete the workflow record

### Requirement: Workflow Records Preserve Removal Metadata

Workflow installation SHALL record exact skill artifact metadata needed for a
future remove command.

#### Scenario: install records skill artifacts

- **WHEN** a user installs a workflow with
  `omniskill install <source> --home <home> --agents codex,claude,cursor`
- **THEN** the installed workflow record includes each installed skill source
- **AND** the record includes the resolved skill name for each skill
- **AND** the record includes exact artifact paths written for each requested
  agent target
- **AND** the record includes mirror artifact paths such as Codex's
  `.codex/skills/<skill>` destination

### Requirement: Shared Artifacts Are Preserved

The remove command SHALL preserve skill artifacts that are still referenced by
another installed workflow record in the same record root.

#### Scenario: two workflows share a skill artifact

- **GIVEN** `release-review.json` and `ops-review.json` both reference
  `<home>/.agents/skills/pony-trail`
- **WHEN** a user runs
  `omniskill remove release-review --home <home> --yes`
- **THEN** the CLI keeps `<home>/.agents/skills/pony-trail`
- **AND** the output explains that the artifact is still used by `ops-review`
- **AND** the CLI still deletes `release-review.json`

### Requirement: Missing Workflow Fails Clearly

The remove command SHALL fail before deleting files when the named workflow is
not installed.

#### Scenario: user removes an unknown workflow

- **WHEN** a user runs `omniskill remove missing-workflow --home <home>`
- **THEN** the CLI fails
- **AND** the error includes `Omniskill is not installed: missing-workflow`
- **AND** no skill artifacts are deleted

### Requirement: Legacy Records Use A Plain Inferred Fallback

The remove command SHALL handle older workflow records without artifact metadata
without silently guessing unsafe paths.

#### Scenario: legacy record has safely mappable skill sources

- **GIVEN** a workflow record has no removal artifact metadata
- **AND** the manifest skills can be mapped to skill names from local skill
  paths, known Matt Pocock sources, known Matt Pocock sources, or bundled skill
  names
- **WHEN** a user runs
  `omniskill remove legacy-workflow --home <home> --yes`
- **THEN** the CLI prints that the removal plan is inferred from a legacy record
- **AND** the CLI removes matching inferred artifact paths that exist
- **AND** the CLI deletes the legacy workflow record

#### Scenario: legacy record has an unmappable skill source

- **GIVEN** a workflow record has no removal artifact metadata
- **AND** one manifest skill source cannot be mapped safely to a skill name
- **WHEN** a user runs
  `omniskill remove legacy-workflow --home <home> --yes`
- **THEN** the CLI skips the unmappable skill source
- **AND** the output explains why the source was skipped
- **AND** no path is deleted for that unmappable source
