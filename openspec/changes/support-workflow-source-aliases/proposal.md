# Proposal: Support Omniskill Workflow Source Aliases

## Summary

Allow Omniskill source commands to accept a public workflow alias such as
`openspec-delivery` as shorthand for the canonical Omniskill examples
repository path:

```bash
npx omniskill@latest@latest install openspec-delivery
npx omniskill@latest@latest install 'https://github.com/devos-ing/omni-skills.git#examples/workflows/openspec-delivery'
```

These two commands should resolve to the same workflow bundle. Existing public
git URL support remains unchanged.

## Motivation

The public install command is currently runnable but visually heavy because
users need to paste the full repository URL and workflow subdirectory. The
examples repository already behaves like the default public catalog for
Omniskill workflows, so common examples should be installable by name while
preserving the explicit URL path for users who want copy-paste transparency.

## Scope

In scope:

- Treat bare workflow aliases as public examples under
  `https://github.com/devos-ing/omni-skills.git#examples/workflows/<alias>`.
- Support alias sources anywhere the shared Omniskill source loader is used:
  `install`, `validate`, and `deps`.
- Preserve the existing explicit public git URL behavior, including
  `#examples/workflows/<name>` fragments.
- Resolve aliases by workflow folder name, not by manifest display name. For
  example, `openspec-delivery` resolves to the `examples/workflows/openspec-delivery`
  folder even though that workflow's manifest name is `openspec-delivery`.
- Write installed workflow source metadata using the resolved canonical public
  git URL, so alias installs and full-link installs have the same durable source
  identity.
- Return a clear "not found" style error when the canonical examples path does
  not contain a valid Omniskill workflow.
- Update README and authoring guidance to show both the alias and explicit URL
  forms.
- Add focused tests for alias source loading, install behavior, public URL
  passthrough, and not-found errors.

Out of scope:

- A hosted registry service or searchable remote index.
- Private repository aliases or authenticated sources.
- Aliases for arbitrary third-party repositories.
- Changing the workflow manifest schema.
- Reintroducing bundled workflow names as local package data.

## Proposed Design Direction

Add a small alias-normalization step in the workflow source resolver before
local and public git handling. If the source is a simple alias token, convert it
to the canonical examples git URL with a `#examples/workflows/<alias>` fragment,
then pass that resolved URL through the existing git clone and subdirectory
loader.

Keep alias syntax conservative: lowercase letters, numbers, and hyphens. Paths
with `/`, `./`, `../`, absolute paths, URLs, and `workflow.json` files should
continue to use the existing local or git behavior.

Alias "not found" should be clearer than a temporary checkout path error. When
the resolved examples subdirectory has no `workflow.json`, the CLI should report
that no Omniskill workflow alias was found for the requested name and include
the canonical path it checked.

## Acceptance Criteria

- `npx omniskill@latest@latest install openspec-delivery` installs the same
  workflow as `npx omniskill@latest@latest install 'https://github.com/devos-ing/omni-skills.git#examples/workflows/openspec-delivery'`.
- `validate` and `deps` accept the same alias source form because they
  share the workflow source loader.
- Explicit public git URLs still work exactly as they do today.
- Alias resolution is based on the folder under `examples/workflows`, not the
  manifest `name` field.
- Installed workflow records from an alias source store the canonical public git
  URL source, including the `#examples/workflows/<alias>` fragment.
- Unknown aliases fail with a clear error naming the requested alias and the
  canonical examples path checked.
- Existing local path and `workflow.json` path behavior continues to work.
- Focused Bun tests cover alias load/install behavior, public URL passthrough,
  and unknown aliases.
- CLI smoke checks cover `deps openspec-delivery` and `validate openspec-delivery`
  against the local examples repo path when network-free verification is needed,
  plus the existing explicit public URL path where network is available.
- `rtk bun run check` passes before delivery.

## Open Questions For Review

- Should aliases be limited to lowercase kebab-case folder names in v1, or
  should the CLI accept broader names and sanitize them into paths?
- Should the command output mention the resolved canonical URL, or keep current
  concise output and only store the canonical URL in the workflow record?
