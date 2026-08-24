# Omniskills Rename Design

**Goal:** Rename the public Omniskills product and canonical CLI command to
Omniskills without breaking existing `omniskill` shell usage.

## Chosen approach

Omniskills becomes the canonical identity. The published package metadata and
primary executable use lowercase `omniskill`; public prose uses the displayed
name **Omniskills**. `omniskill` remains a compatibility executable that
invokes the same program.

This avoids a breaking command migration while giving all new installation,
help, and documentation examples one consistent name.

## Public surface

- Set the package name to `omniskill`.
- Publish both `omniskill` and `omniskill` executable entries, with
  `omniskill` documented as the canonical command.
- Update Commander metadata, help text, banners, success and error messages,
  and generated loop command suggestions to use Omniskills and `omniskill`.
- Update active README, documentation, landing-page content and metadata,
  examples, supported scripts, diagrams, and tests that describe the product
  or invoke its public command.
- Add regression coverage that asserts `omniskill` is canonical and the
  `omniskill` executable remains in package metadata.

## Compatibility boundaries

- Do not rename internal TypeScript modules, runtime folders, environment
  variables, or `.omniskills` state. Existing installed workflow records
  and generated runners therefore remain readable and usable.
- Keep the `mattpocock:` dependency namespace unchanged; it refers to an
  external skill source rather than this product.
- Do not mass-rewrite historical OpenSpec proposals or archived records.
- Keep the existing GitHub repository URL until the remote repository is
  explicitly renamed; this change neither renames nor publishes remote
  resources.

## Verification

Run focused package and CLI tests, smoke the canonical help and representative
commands, then run `rtk bun run check`. Inspect the final diff to confirm that
only active public references changed and compatibility paths remain present.
