# Orchestration Preflight Capabilities and Model Discovery

## Problem

`startup-goal` requires a dispatch preflight to disclose an adapter and prove
that the selected runtime can provide `launch_configured` evidence. The current
dry-run plan exposes only `evidenceRequired`, omits the adapter, and therefore
cannot satisfy its own workflow contract. Separately, generated Codex profiles
come from static model names. The installed Codex CLI may not expose those
models to the signed-in identity, so a structurally valid plan can be
unlaunchable.

## Considered Approaches

1. Keep static model defaults and change only the skill wording. This is small,
   but it hides the real compatibility problem and will regress as model access
   changes.
2. Launch a no-op Codex session for every model candidate. This proves access,
   but consumes a session, may incur usage, and creates state during install.
3. Use the Codex CLI model catalog and expose adapter capability metadata in the
   plan. This is the selected approach because `codex debug models` is a
   documented machine-readable catalog and does not execute an agent task.

## Dispatch Capability Contract

`OrchestrationDispatcher` exposes immutable preflight metadata:

- `adapter`: the concrete launch adapter, initially `codex-cli`.
- `evidenceCapability`: the strongest evidence the adapter is designed to
  produce without relying on an optional runtime event, initially
  `launch_configured`.

Planning receives a runtime capability record rather than a boolean. Every
`DispatchPlan` persists `adapter` and `evidenceCapability`. Dry-run may claim
only capability, never actual evidence. Actual `evidence` remains a receipt
field written after a launch attempt. If no adapter is available, planning
continues to fail closed.

The startup-goal preflight gate accepts a plan only when its declared
`evidenceCapability` is at least `launch_configured`. After execution, the
coordinator checks the receipt's actual evidence independently. This removes
the contradiction without weakening evidence semantics.

## Model Catalog Adapter

A Codex plugin seam runs `codex debug models` and validates its JSON with Zod.
The normalized catalog contains only the fields orchestration needs: model
slug, visibility, priority, and supported reasoning efforts. Core runtime code
never performs network or process I/O.

Installation requests the catalog only when the workflow has orchestration and
Codex is one of the requested targets. For each Codex tier, default generation
selects the lowest-priority-number visible model supporting that tier's effort:

- `deep`: `high`
- `standard`: `medium`
- `fast`: `low`

Claude defaults remain unchanged because Claude execution is not yet a verified
adapter. If catalog discovery is unavailable or no model supports a required
effort, installation fails before profile writes with an actionable typed
error. It does not fall back to an unverified static model.

## Configuration Migration

When `~/.omniskills/orchestration.json` does not exist, installation writes the
catalog-derived configuration. When the file exactly matches the previously
shipped default content, it is treated as generated legacy state and may be
atomically updated to the catalog-derived defaults. Any other existing file is
custom configuration: it is validated against the catalog and fails closed if
it names an unavailable model or unsupported reasoning effort. Custom files are
never rewritten automatically and lower-tier fallback policy is unchanged.

Profile generation remains deterministic from the resolved configuration.
Managed profiles update only when their recorded content is unchanged; drifted
or foreign profiles retain the existing conflict behavior.

## Error Handling

Catalog command failure, malformed catalog JSON, an empty visible catalog, an
unsupported configured model, and an unsupported configured effort are
distinct failures. Diagnostics name the model, effort, target tier, and the
remediation: update Codex, authenticate the intended identity, or edit the
custom orchestration configuration.

No catalog failure launches an agent, writes profiles, or mutates a custom
configuration file.

## Public Test Seams

Tests cover behavior through these agreed public seams:

1. `createCodexCliDispatcher` returns adapter and evidence capability metadata.
2. `omniskill dispatch --dry-run --json` returns that metadata while writing no
   run state.
3. The Codex catalog plugin parses documented catalog output and reports typed
   failures for malformed or unavailable catalogs.
4. `loadOrchestrationConfigPlan` creates catalog-derived defaults, migrates only
   the exact legacy generated default, and rejects unsupported custom entries.
5. `omniskill install` injects discovery through the plugin seam and writes the
   resulting managed profiles only after approval.
6. The startup-goal source contract distinguishes preflight capability from
   post-launch receipt evidence.

## Rollout and Verification

After focused red-green cycles, run `rtk bun run check`. Then reinstall
`startup-team` into the user's global home, inspect the resulting configuration
and managed profile hashes, run CTO and QA dry-run preflights, and launch both
read-only review roles. Disclose each run ID, adapter, tier, model, effort,
access, and actual receipt evidence.

The rollout does not implement Claude dispatch, lower-tier automatic fallback,
or early cancellation on a runtime model mismatch. Those remain separate
architecture work.
