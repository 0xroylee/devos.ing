# Deliver Code Workflow Design

**Status:** Approved design

**Date:** 2026-07-20

## Goal Tunnel

Create a reusable Omniskills workflow named `deliver-code` with one callable
entry skill, `$deliver-code`. It serves developers and coding agents in any
repository and can later receive an approved engineering handoff from
`$startup-goal`.

The workflow solves three related problems:

- durable project knowledge, engineering rules, and delivery artifacts lack a
  consistent ownership boundary;
- coding work is often split horizontally by function instead of into complete,
  independently verifiable user outcomes;
- the existing `development-design-delivery` compatibility workflow uses a
  fixed prototype and multi-gate path that should not be silently changed into
  an adaptive general-purpose workflow.

The approved outcome is a complete first-run repository skeleton followed by
an adaptive delivery path:

```text
Grill -> Domain Modeling -> Spec -> Vertical Tickets
      -> Implement/TDD -> Code Review -> Verification
```

Small, clear changes may skip unnecessary discovery, modeling, design, or
multi-ticket decomposition. Testing, two-axis review, and fresh completion
verification remain mandatory.

### Scope

- Add a standalone `examples/workflows/deliver-code` workflow bundle.
- Keep durable rules, glossary, architecture decisions, design, and specs in
  the repository.
- Keep heavy research, source material, and experiments in a sibling
  `<repo-name>.knowledge/` directory.
- Prefer GitHub Issues for vertical tickets and use repository-local Scratch
  when GitHub is unavailable or unauthorized.
- Support direct and delegated invocation contracts without changing the
  production CLI dispatch boundary.
- Reuse pinned Matt Pocock v1.1.0 skills rather than copying their behavior.

### Non-goals

- Do not replace or rename `development-design-delivery` in the first
  milestone.
- Do not put the coding lifecycle inside `$startup-goal`.
- Do not add a CLI dispatcher, automatic agent launch, or a conditional
  workflow-manifest schema.
- Do not force an ADR, a new spec, or multiple tickets for every small fix.
- Do not let research material silently become an approved requirement.
- Do not grant commit, issue-publication, or other external-write authority
  implicitly.

## Research Findings

Codex automatically loads the `AGENTS.md` instruction chain, not every document
in a repository. Durable project documents can therefore remain versioned with
the code while `AGENTS.md` stays concise and navigational. OpenAI documents a
default combined project-instruction limit of 32 KiB and nested instruction
precedence:
<https://developers.openai.com/codex/guides/agents-md>.

An ADR captures one architecturally significant decision and its rationale,
trade-offs, and consequences. The collection forms a decision log:
<https://adr.github.io/>.

GitHub Issues supports sub-issues and explicit blocking relationships, which
matches the approved vertical-ticket graph:
<https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues>.

The audited Matt Pocock skill contracts already provide the requested core
disciplines:

- `grill-with-docs` combines a rigorous interview with domain-model updates;
- `domain-modeling` limits `CONTEXT.md` to ubiquitous language and creates ADRs
  only for durable, surprising trade-offs;
- `to-spec` captures behavior, decisions, test seams, and non-goals;
- `to-tickets` creates tracer-bullet vertical slices with blocking edges;
- `tdd` requires behavior-first red/green work at approved public seams;
- `code-review` separates repository Standards findings from Spec findings;
- `verification-before-completion` requires fresh evidence before any success
  claim.

Two upstream behaviors require an explicit local adapter contract:

- `to-tickets` uses a root `tickets.md` for local fallback, while this design
  uses `.scratch/deliver-code/<work-id>/tickets.md`;
- `implement` commits by default, while this design requires commit authority
  to be separately approved.

## Approaches Considered

### Add a new canonical workflow (selected)

Create `deliver-code` as a new normal workflow bundle. Keep the old workflow
unchanged during the compatibility period, then integrate delegated mode with
`startup-team` in a separate milestone. This has the smallest compatibility
surface and preserves a clear product-versus-engineering seam.

### Rewrite `development-design-delivery`

This would create fewer files, but it would change an existing public command
from a mandatory prototype/design workflow into an adaptive workflow. Current
tests pin its exact sources, steps, and approval gates, so the change would be
behaviorally breaking even if the manifest stayed valid.

### Put the lifecycle inside `$startup-goal`

This would minimize public entry points, but it would combine product goal
ownership with engineering artifacts and code execution. It would also make the
flow unavailable to ordinary repositories that do not need a startup team.

## Bundle Architecture

```text
examples/workflows/deliver-code/
  workflow.json
  workflow.lock.json
  README.md
  skills/
    deliver-code/
      SKILL.md
      agents/openai.yaml
      scripts/scaffold.mjs
      assets/scaffold/
      references/
        artifact-contract.md
        delivery-contract.md
```

The manifest and entry skill are different contracts:

- `workflow.json` declares the installable dependency graph, pinned skill
  sources, coarse stages, and approval metadata.
- `SKILL.md` detects invocation mode, enforces the immutable scope boundary,
  chooses or skips adaptive phases, controls permissions, and reports the
  visible current state.
- `scripts/scaffold.mjs` performs dependency-free dry-run and additive
  scaffold reconciliation.
- `assets/scaffold/` contains deterministic first-run templates.
- `artifact-contract.md` defines the single purpose and owner of each durable
  artifact.
- `delivery-contract.md` defines direct and delegated inputs, plan approval,
  scope deltas, mutation permissions, and result evidence.

The bundle omits `kind`, so it remains a normal workflow rather than a team.
The first milestone does not change `src/cli.ts`, `src/omniskill.ts`, or any
runtime module.

## First-run Scaffold

An explicit direct `$deliver-code` invocation authorizes additive, idempotent
scaffold setup before feature-plan approval. It does not authorize code, tests,
behavioral configuration, issue publication, or commits.

Delegated mode requires workspace-write permission in its inherited packet
before performing the same scaffold setup. Without that permission it returns
a prepared scaffold delta and pauses.

```text
<repo>/
  AGENTS.md
  CONTEXT.md
  docs/
    architecture.md
    adr/
      README.md
    design/
      README.md
    specs/
      README.md
  .scratch/
    deliver-code/
      README.md

<repo-name>.knowledge/
  README.md
  research/
  sources/
  experiments/
```

The scaffold rules are:

- inspect and preserve every existing file;
- add only a marked `$deliver-code` navigation section to `AGENTS.md`;
- initialize `CONTEXT.md` with purpose, ownership, and entry format but no
  invented terms;
- create directory indexes rather than fabricated architecture, decisions,
  designs, or requirements;
- keep clarification-time ADRs in `Proposed` state until the plan approves the
  associated decision;
- stop on any collision that requires reinterpretation, replacement, or
  structural migration;
- request permission when the sibling knowledge directory is not writable and
  never relocate heavy research into the repository silently;
- never make the sibling directory a build or test dependency.

## Artifact Ownership

| Artifact | Single purpose | Content owner |
| --- | --- | --- |
| `AGENTS.md` | Rules, commands, and project navigation | Repository owner; `$deliver-code` owns only its marked section |
| `CONTEXT.md` | Canonical glossary and ubiquitous language | Domain Modeling |
| `docs/adr/*` | Rationale and consequences for one qualifying durable decision | Domain Modeling |
| `docs/architecture.md` | Current system boundaries, dependency direction, and structure | Architecture/design phase |
| `docs/design/*` | Approved conceptual solution for a bounded change | Design phase |
| `docs/specs/*` | Approved behavior, scope, acceptance, test seams, and non-goals | Spec phase |
| GitHub Issues or Scratch tickets | Executable vertical work graph | Ticketing phase |
| Code and tests | Working behavior at approved public seams | Implement/TDD |
| Review result | Separate Standards and Spec findings | Code Review |
| Verification evidence | Fresh command output and requirement checklist | Verification |
| `<repo-name>.knowledge/` | Heavy research, sources, and experiments | Research-producing phase |
| Scratch state | Resume point, tracker state, evidence pointers, and next action | `$deliver-code` coordinator |

Specs and ADRs retain history through revision or supersession. Architecture
describes current truth and is updated in place. Scratch state points to source
artifacts rather than duplicating their contents.

## Invocation Contracts

Every invocation presents one visible status line:

```text
Mode -> Scaffold -> Work item -> Selected route -> Current gate -> Next action
```

It also emits a route receipt naming every selected and skipped phase, why a
phase was skipped, and what condition would re-enter it.

### Direct mode

1. Inspect repository rules, documents, tracker configuration, and current
   state.
2. Reconcile the safe first-run scaffold.
3. Classify the work and select an adaptive route.
4. Clarify engineering scope and maintain resolved domain language.
5. Produce or reuse a spec and vertical-ticket graph in proportion to the
   change.
6. Present one complete plan-approval package.
7. After approval, work only the dependency-ready ticket frontier, one ticket
   at a time.
8. Run the two-axis review and fresh verification.
9. Present result evidence and wait for acceptance or rework direction.

The plan-approval package contains:

- mode and immutable scope boundary;
- selected and skipped stages with re-entry conditions;
- acceptance criteria and approved test seams;
- proposed artifact changes;
- vertical tickets and blocking edges;
- implementation frontier;
- review fixed point and Standards/Spec sources;
- verification commands;
- a mutation envelope that separately names code edits, GitHub Issue
  publication, commits, and other external actions.

### Delegated mode

The packet must include:

- `mode: delegated`;
- source coordinator and milestone identifier;
- approved Goal Tunnel reference or snapshot;
- approved scope, non-goals, and acceptance criteria;
- implementation-plan boundary;
- repository context and permissions;
- prior decisions that may not be reopened;
- human plan-approval evidence before implementation.

Delegated mode may ask only for contradictory evidence or missing execution
details. It must not repeat product discovery, reinterpret non-goals, or add
requirements. It returns its engineering plan to `$startup-goal` for the
existing plan gate and returns implementation, review, and verification
evidence afterward. Independent QA, User Outcome Replay, and milestone
acceptance remain owned by `$startup-goal` and its accountable roles.

A missing or inconsistent delegated packet produces a structured scope delta;
it never silently falls back to direct mode.

## Adaptive Routes

| Work shape | Expected route |
| --- | --- |
| Clear small fix | Existing approved request or one compact work item -> approved test seam -> Implement/TDD -> Review -> Verification |
| Bounded feature | Grill as needed -> Domain Modeling when vocabulary changes -> Spec -> vertical Tickets -> Implement/TDD -> Review -> Verification |
| Ambiguous or architecture-heavy work | Full Grill -> Domain Modeling -> Spec -> Design/ADR as warranted -> vertical Tickets -> Implement/TDD -> Review -> Verification |

`grill-with-docs` supplies the interview and maintains domain knowledge while
the workflow still exposes Grill and Domain Modeling as distinct lifecycle
checkpoints. `docs/specs/` remains the canonical spec store even when a tracker
contains a linked planning issue. Local tickets use the approved Scratch path
rather than upstream's root `tickets.md` fallback.

The upstream `implement` skill may be invoked only when the approved mutation
envelope permits its commit behavior. Otherwise the implementation phase uses
the approved TDD contract without an implicit commit. No stage may treat plan
approval as authorization for external actions that were not named explicitly.

## Resume State

```text
.scratch/deliver-code/<work-id>/
  state.json
  tickets.md
  evidence.md
  scope-delta.md
```

`state.json` stores pointers and progress only:

- schema version and mode;
- scaffold status;
- active stage and active ticket;
- selected and skipped stages;
- gate and approval evidence;
- mutation permissions;
- tracker state and stable ticket identifiers;
- artifact paths;
- last verification result and timestamp.

Resume first reconstructs the approved state from the spec, ticket graph, Git
state, and evidence pointers. It displays the last verified checkpoint before
continuing. It never treats stale verification as proof for a new completion
claim.

## Error and Re-entry Rules

- Existing-path collision: preserve the path and request a targeted decision.
- Sibling-directory permission failure: request permission and report the
  scaffold as partial.
- Missing delegated field or contradiction: return a scope delta without
  edits.
- New product requirement: return to `$startup-goal` without modifying the
  inherited Goal Tunnel.
- Missing dependency skill: stop before the affected phase and label the
  handoff `Prepared, not executed`.
- GitHub failure or missing authorization: keep stable ticket IDs in Scratch
  with a pending-promotion marker so later synchronization does not duplicate
  tickets.
- Test, review, or verification failure: keep the active ticket incomplete and
  allow one repair inside the approved boundary. A repeated failure returns to
  the user.
- Missing subagent capability for the mandatory two-axis review: prepare the
  review handoff and pause; never silently skip review.
- Material plan change: invalidate only affected downstream work and require
  renewed plan approval.
- Runtime launch unavailability: never invent a launch, run ID, receipt, or
  automatic role result.

## Milestones

### M1: Standalone direct delivery

**Outcome:** Installable `$deliver-code` workflow with deterministic first-run
scaffolding, adaptive direct routing, approval boundaries, and resumable local
state.

**Accountable outcome role:** Product Manager.

**Dependencies:** None.

**Acceptance criteria:**

- empty repositories receive the complete skeleton;
- repeated scaffolding produces no unintended diff;
- existing project documents are preserved;
- small fixes may skip unnecessary planning artifacts but not quality gates;
- substantial work produces a canonical spec and vertical ticket graph;
- code changes, commits, and issue publication require explicit approval;
- interrupted or failed work resumes from visible state;
- dependency sources remain pinned to Matt Pocock v1.1.0;
- workflow validation, dependency resolution, install smoke, forward tests, and
  the repository gate pass.

### M2: Startup-team delegated delivery

**Outcome:** `$startup-goal` prepares a bounded manual `$deliver-code` handoff,
and the installed team supplies the delegated workflow without claiming
automatic execution.

**Accountable outcome role:** CTO.

**Dependencies:** M1 accepted.

**Acceptance criteria:**

- the delegated packet requires Goal Tunnel, approval, scope, permissions, and
  acceptance evidence;
- scope drift returns upstream;
- only implementation and rework receive workspace-write access;
- QA, User Outcome Replay, and milestone acceptance keep their existing owners;
- child-workflow dependency expansion, lock generation, fresh install, and
  removal behavior are verified before plan approval.

### M3: Public compatibility and positioning

**Outcome:** `deliver-code` becomes the recommended coding workflow while
`development-design-delivery` retains its existing public behavior until a
separate deprecation decision is approved.

**Accountable outcome role:** Product Manager.

**Dependencies:** M2 accepted.

**Acceptance criteria:**

- public docs distinguish the adaptive canonical workflow from the fixed
  compatibility workflow;
- existing `development-design-delivery` manifest, entry skill, and tests do
  not change silently;
- any deprecation or migration has its own explicit approval and compatibility
  period.

Only M1 is active in the next implementation plan.

## Testing and Verification

Focused bundle tests must assert:

- one local callable entry skill;
- exact pinned dependencies and stage ownership;
- direct and delegated contract headings;
- mandatory test, review, and completion gates;
- absence of automatic-launch claims;
- unchanged `development-design-delivery` identity and step behavior.

Scaffold tests must cover:

- empty repository;
- repeat idempotency;
- existing customized `AGENTS.md`, `CONTEXT.md`, and docs;
- path collision;
- sibling knowledge directory creation and permission failure;
- dry-run output;
- no code, behavior configuration, issue, or commit mutation during scaffold.

Forward tests must run the installed skill in fresh scratch repositories for:

- a clear small fix;
- a bounded feature needing spec and tickets;
- a repository with conflicting pre-existing paths.

The implementation verification ladder is:

```bash
rtk bun test tests/workflow-bundles.test.ts
rtk bun run dev -- validate examples/workflows/deliver-code
rtk bun run dev -- deps examples/workflows/deliver-code
rtk bun run check
```

Fresh install, list, and remove-dry-run smokes are additionally required before
calling M1 complete.

## Evidence Ledger

### Verified

- `docs/architecture.md` distinguishes bundle manifests from callable local
  entry skills and states that production agent launch is disabled.
- `examples/workflows/development-design-delivery/workflow.json` and its entry
  skill define a fixed, mandatory design and implementation chain.
- `tests/workflow-bundles.test.ts` pins that workflow's exact dependencies and
  steps and enforces Matt Pocock v1.1.0 across examples.
- `examples/teams/startup-team/workflow.json` currently assigns implementation
  and rework to `mattpocock:implement`, followed by independent QA and outcome
  evaluation.
- The installed Matt Pocock contracts define glossary-only `CONTEXT.md`,
  selective ADR creation, vertical tracer-bullet tickets, approved test seams,
  two-axis review, and fresh verification.
- OpenAI documents that Codex automatically loads the `AGENTS.md` instruction
  chain rather than every repository document.
- GitHub documents native issue dependency and sub-issue relationships.

### Inferred

- A new normal workflow plus a later child-workflow integration has the
  smallest compatibility surface.
- A deterministic scaffold script is safer and more testable than repeatedly
  reconstructing the same file merge behavior from prose.
- A single plan package with a mutation envelope prevents duplicated gates
  while keeping external actions explicit.
- A non-semantic initial `CONTEXT.md` satisfies the complete-skeleton decision
  without inventing domain knowledge.

### Assumed

- Target repositories normally provide a Node-compatible runtime for the
  dependency-free `.mjs` scaffold script. Validate this through install and
  fresh-repository smoke tests.
- Repository parents may require additional permission for the sibling
  knowledge directory. The workflow must stop and request it rather than use an
  unapproved fallback.
- M2 can represent `deliver-code` as a structurally valid child workflow in the
  team dependency graph. This must be verified before M2 plan approval and does
  not block M1.

## Risks

- Existing documentation conventions may conflict with the skeleton. Additive
  ownership markers and collision stops protect user content.
- Static manifest steps may look unconditional even though the entry skill is
  adaptive. Step instructions and contract tests must name mandatory versus
  conditional stages explicitly.
- Specs, GitHub Issues, and Scratch can diverge. The repo spec remains canonical
  and stable IDs plus pending-promotion metadata prevent duplicate tickets.
- External research may become stale or unavailable. Accepted repository
  artifacts, not raw research, define implementation scope.
- Upstream skills may attempt actions outside the mutation envelope. The entry
  skill must not invoke a dependency whose fixed behavior exceeds approved
  authority.
- Mandatory review may be unavailable on hosts without subagents. The workflow
  must pause with a prepared handoff instead of lowering the quality gate.

## Plan Boundary

The next plan may implement M1 only: the standalone bundle, entry contract,
scaffold resources, focused tests, direct-mode smoke, forward testing, and
documentation necessary to install and use `$deliver-code`.

It may not modify `startup-team`, `startup-goal`, production runtime modules,
CLI dispatch behavior, landing pages, or `development-design-delivery` behavior.
