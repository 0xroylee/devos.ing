## ADDED Requirements

### Requirement: Omniskill commands SHALL resolve public workflow aliases

The Omniskill workflow source loader SHALL accept a bare workflow alias and
resolve it to the canonical public examples repository path
`https://github.com/devos-ing/omni-skills.git#examples/workflows/<alias>`.

#### Scenario: user installs the OpenSpec workflow by alias

- **WHEN** the user runs `omniskill install openspec-delivery`
- **THEN** the CLI resolves the source to
  `https://github.com/devos-ing/omni-skills.git#examples/workflows/openspec-delivery`
- **AND** installs the workflow using the same behavior as the explicit public
  git URL.

#### Scenario: user inspects an alias before installing

- **WHEN** the user runs `omniskill validate openspec-delivery`
- **THEN** the CLI validates the workflow at
  `examples/workflows/openspec-delivery` in the canonical public examples
  repository.
- **WHEN** the user runs `omniskill deps openspec-delivery`
- **THEN** the CLI lists that workflow's declared skill dependencies.

#### Scenario: explicit public git source remains supported

- **WHEN** the user runs
  `omniskill install 'https://github.com/devos-ing/omni-skills.git#examples/workflows/openspec-delivery'`
- **THEN** the CLI uses the existing public git source path without treating the
  URL as an alias.

#### Scenario: alias folder name differs from manifest name

- **WHEN** the user runs `omniskill install openspec-delivery`
- **THEN** alias resolution uses the `openspec-delivery` folder name under
  `examples/workflows`.
- **AND** the installed workflow may still use its manifest `name`, such as
  `openspec-delivery`, for display and workflow record filenames.

#### Scenario: installed alias source records canonical metadata

- **WHEN** an alias install succeeds
- **THEN** the installed workflow record identifies the source as `kind: "git"`.
- **AND** the recorded `url` is the canonical public git URL with the
  `#examples/workflows/<alias>` fragment.
- **AND** a resolved commit is recorded when `git rev-parse HEAD` succeeds.

#### Scenario: requested alias is not found

- **WHEN** the user runs `omniskill install missing-workflow`
- **AND** the canonical examples path
  `examples/workflows/missing-workflow` does not contain a `workflow.json`
- **THEN** the CLI fails with a clear error naming `missing-workflow`.
- **AND** the error includes the canonical public examples path that was checked.

#### Scenario: local paths remain explicit

- **WHEN** the user runs `omniskill install ./release-review`
- **THEN** the CLI treats the source as a local path.
- **WHEN** the user runs `omniskill install release-review/workflow.json`
- **THEN** the CLI treats the source as a local workflow manifest path.
