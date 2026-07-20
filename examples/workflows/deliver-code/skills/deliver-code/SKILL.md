---
name: deliver-code
description: "Use when delivering a coding feature, fix, or refactor through repository scaffolding, adaptive clarification, domain language, specs, vertical tickets, TDD, review, and fresh verification; also accepts an approved startup-goal engineering handoff."
---

# Deliver Code

Deliver one approved vertical coding slice at a time. Keep project intent and engineering evidence durable without loading every document into context.

Read `references/artifact-contract.md` before creating or changing project documents. Read `references/delivery-contract.md` before planning a direct run or accepting a delegated packet.

Always show:

```text
Mode -> Scaffold -> Work item -> Selected route -> Current gate -> Next action
```

Also show selected stages, skipped stages, why each was skipped, and the exact condition that would re-enter it.

## Safe scaffold

On the first explicit direct invocation, run `scripts/scaffold.mjs` for the target repository. This authorizes only additive, idempotent scaffold writes. It does not authorize code, tests, behavioral configuration, GitHub Issues, or commits. Inspect existing files first and stop on an incompatible path.

Delegated mode may scaffold only when its packet includes workspace-write permission. Otherwise return the proposed scaffold delta as `Prepared, not executed`.

## Direct mode

1. Inspect repository rules, current artifacts, tracker configuration, Git state, and any `.scratch/deliver-code` resume record.
2. Reconcile the safe scaffold.
3. Create or resume `.scratch/deliver-code/<work-id>/state.json` using the state record in `references/delivery-contract.md`. Update it after every stage, gate decision, ticket transition, and verification run.
4. Classify the request:
   - clear small fix: reuse the approved request, agree a public test seam, and create one verifiable work item;
   - bounded feature: Grill as needed, update changed domain language, write a canonical spec, and draft vertical tickets;
   - ambiguous or architecture-heavy work: run the full Grill, Domain Modeling, Spec, Design or ADR when warranted, and vertical-ticket route.
5. Present one plan approval package. Stop before implementation.
6. After approval, implement only the dependency-ready frontier, one ticket at a time, using TDD at approved public seams.
7. Run Standards and Spec code-review axes, then fresh verification.
8. Present result evidence and wait for accept or rework direction.

## Delegated mode

Require the complete delegated packet defined in `references/delivery-contract.md`. Echo the inherited Goal Tunnel, scope, non-goals, acceptance criteria, permissions, immutable decisions, and approval evidence.

Do not repeat product discovery, reinterpret non-goals, or add requirements. Ask only about contradictory evidence or missing engineering details. Return a structured scope delta to `$startup-goal` when new product scope is required. Never silently fall back to direct mode.

Return an approval-ready engineering plan to `$startup-goal`; after an approved implementation handoff, return code, test, review, and verification evidence. Independent QA, User Outcome Replay, and milestone acceptance remain upstream.

## Plan approval package

Include mode, immutable scope, route receipt, acceptance criteria, approved test seams, artifact changes, vertical tickets and blockers, implementation frontier, review fixed point, Standards and Spec sources, verification commands, risks, and a Mutation envelope.

The Mutation envelope authorizes code edits, GitHub Issue publication, commits, and other external actions separately. Approval of one never implies another. The upstream `implement` skill commits by default, so invoke it only when commit permission exists; otherwise execute the approved TDD phase without committing.

## Artifact and tracker rules

- `CONTEXT.md` is glossary-only.
- Create an ADR only for a hard-to-reverse, surprising, genuine trade-off.
- `docs/architecture.md` describes current truth.
- `docs/design/` describes an approved bounded solution.
- `docs/specs/` is the canonical specification store.
- Before plan approval, keep spec and ticket drafts local. Publish GitHub Issues only when the approved Mutation envelope permits issue publication.
- Tickets are independently verifiable vertical slices with explicit blockers.
- Prefer authorized GitHub Issues; otherwise use `.scratch/deliver-code/<work-id>/tickets.md` with stable IDs and pending promotion metadata.
- Heavy research lives only in the sibling `<repo-name>.knowledge/` tree and never becomes an acceptance source without an approved repo artifact.

## Failure and re-entry

- Stop on scaffold collision or missing sibling-directory permission.
- Return a scope delta for missing or contradictory delegated inputs.
- Keep the current ticket open when tests, review, or verification fail.
- Allow one repair inside the approved boundary; a repeated failure returns to the user.
- If a required skill or subagent capability is unavailable, return the exact phase handoff labeled `Prepared, not executed`; never skip the gate.
- Resume by reading the canonical spec, ticket graph, Git state, state pointers, and last evidence, then show the last verified checkpoint.

## Quality policy

Testing, two-axis review, and fresh completion verification are mandatory. 90% line coverage is sufficient. Never add low-value tests merely to chase 100% coverage. Test public behavior, approved seams, material failures, and regression risk.

Never claim automatic dispatch, invent a run ID or receipt, or claim completion from stale or partial evidence.
