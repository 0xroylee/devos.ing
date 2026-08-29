---
name: startup-goal
description: "Use when moving an approved startup goal through evidence-backed, reviewable feature milestones."
---

# Startup Goal

Move one approved feature milestone at a time from direction through plan,
implementation, QA, user-outcome evaluation, and acceptance. The coordinator
controls direction, scope, packet interfaces, evidence quality, state
transitions, and human gates. It must not prescribe a role's framework, tool,
optional method, research process, or conclusion.

## 1. Clarify and approve the goal tunnel

Build the **Goal Tunnel** from the user's goal, target user, problem, desired
outcome, scope, non-goals, constraints, permissions, success criteria, and
explicit assumptions. Ask one material question at a time when an unknown could
change scope, routing, or risk. The coordinator may compare later work with this
tunnel, but it may not expand or rewrite it without human approval.

## 2. Decompose feature milestones

Propose ordered, user-visible milestones. Each needs an ID, title, feature
outcome, accountable outcome role, dependencies, and acceptance criteria.
Choose the smallest safe role set for the active milestone and show skipped
roles with evidence and re-entry conditions. Work on only one milestone at a
time; wait for plan approval before implementation and feature acceptance
before activating the next milestone.

## 3. Execute roles through bounded packets

Give every selected expert the same bounded **Input Packet** interface:

- approved Goal Tunnel and current feature outcome;
- accountable outcome role and decision required;
- available source or repository context;
- constraints and permissions;
- expected artifact and acceptance criteria;
- prior approved decisions that may not be silently reopened.

Describe what the role must achieve, not how it must think. Before launch,
classify each selected role as dependency-free or dependent, name every required
role, and capture the selected roles' stable pre-launch order. A dependency-free
role needs no other role's Output Packet; a dependent review or repair names the
prerequisite packet it needs and runs only after that prerequisite completes.

When the host exposes an internal agent-launch capability and the installed
startup-team role profiles are available, submit every dependency-free selected
role before awaiting any result; submit all dependency-free selected roles
before the first await. The coordinator owns classification,
packets, required-role validation, and deterministic synthesis; the host owns
capacity and may schedule the submitted work as it can. Use one logical
all-settled barrier to collect the wave: keep healthy siblings running after one
role fails, record every success or failure, and never let completion timing
change the result. At that barrier, wait for its completed Output Packet from
each submitted role. Synthesize in captured pre-launch order, using conforming
packets only and never completion order, while preserving material disagreements.
Launch dependent reviews or repairs only after their prerequisites and the
relevant packet validation complete.

Every required planning role must produce a conforming Output Packet before plan
approval. Required planning role failure blocks plan approval after the
all-settled barrier; it does not cancel healthy siblings. If the launch
capability or a requested profile is unavailable, return a bounded Input Packet
labeled `Prepared, not executed`, name the unavailable capability or profile,
and stop without implying that the role ran.

## 4. Validate role output packets

Require an **Output Packet** with recommendation, alternatives considered,
Evidence Ledger, risks, unresolved questions, verification method, and
recommended next action. Reject only missing fields, unsupported material
claims, goal drift, or unverifiable acceptance conditions. A conforming packet
must not be rejected because the role chose a different method or conclusion.

Allow one repair for an invalid output. If a material conflict remains, allow
one targeted review by the role accountable for that decision, preserve both
positions, then escalate to the human instead of averaging them.

## 5. Enforce evidence and approval gates

Classify every material claim in the **Evidence Ledger**:

- **Verified:** cite a URL, repository path, command output, user artifact, or
  observed dataset; include the observation or publication date when freshness
  matters.
- **Inferred:** name the supporting evidence and explain the reasoning link.
- **Assumed:** disclose that it is unverified, the consequence if false, and a
  concrete validation action.

High-impact or uncertain claims must be Verified before plan approval. Keep
conflicting or stale evidence visible. Low-risk assumptions may proceed only
when explicit and testable. Missing critical evidence blocks the milestone;
never invent support. Present the plan boundary, evidence, risks, assumptions,
and acceptance criteria, then wait for explicit human plan approval.

## 6. Execute implementation and QA roles

Implementation execution modes are `internal` and run-scoped `visible_task`;
internal remains the default. After plan approval, the coordinator may offer
`visible_task` only for the active milestone and only after a separate explicit post-plan confirmation. Plan approval alone never authorizes visible task creation, and ambiguous `approve` or `yes` is never task authorization.

Before asking for that confirmation, call the host capability `list_projects`.
The selected returned opaque project identity must resolve the visible task
target before confirmation or creation. Then show the deterministic title
`[startup-goal] Implement <milestone-id> — <milestone title>`, the exact
`gpt-5.6-terra` model, reasoning effort high, selected project, filesystem
target, and workspace-write boundary. Keep the root model and global routing
unchanged. For a Git project, list projects first and default to an isolated worktree; use `startingState: working-tree` when the approved work depends on
current uncommitted changes. Direct current-checkout execution requires explicit choice. For a non-Git project, use the saved project.

After both gates, send the configured `deliver-code` profile the existing
stage-specific delegated delivery packet containing `mode: delegated`, the
source coordinator and milestone ID, the approved Goal Tunnel, scope and non-goals,
acceptance criteria, the implementation-plan boundary, permissions,
repository context, immutable decisions, and plan approval evidence. Send the
bounded packet, never the full transcript. A visible task must be configured
with `gpt-5.6-terra` and reasoning effort high.

Create exactly one visible implementation task per milestone. Persist and reuse
the created task ID and workspace reference for result collection, one bounded
correction request, and the single permitted rework. If creation is ambiguous,
reconcile the same title, project, workspace, model, and task identity before
continuing; do not silently duplicate, replace, blindly retry, or fall back
modes. Re-entry and rework use the same visible task, not a replacement.

Wait for and validate its result: summary, changed files, review findings,
fresh verification commands, and exact workspace identity. QA may start only
after a conforming implementation result and exact workspace identity validate.
The implementation role may clarify execution details but may not reopen
approved product scope; scope drift returns to planning.

Next launch the configured `qa-lead` profile with the approved acceptance
criteria, changed artifacts, and verification evidence; wait for and validate
its acceptance, regression, release-risk, and verification packet. A QA failure
permits one bounded deliver-code rework inside the approved plan; a new
requirement returns to planning.

## 7. Reconstruct and evaluate the user outcome

After QA passes, launch the installed profile for the accountable outcome role
with the original requirements and verified result evidence, then wait for its
**User Outcome Replay**. The coordinator validates the returned interface; it
does not perform the role's content analysis.

The evaluator recreates the original user or customer, their expectations,
required needs, non-required wishes, and intended journey steps from the Goal
Tunnel and Input Packet. It then marks each item `met`, `partially_met`, `unmet`,
or `not_evaluated`, cites the original requirement and result evidence, records
friction and journey deviations, distinguishes a missed approved requirement
from a newly discovered wish, and recommends accept, rework, or a later
milestone. A new wish is not a retroactive requirement.

## 8. Carry accepted context forward

At feature acceptance, retain the Goal Tunnel, approved decisions, accepted
artifacts, evidence, unresolved risks, User Outcome Replay, and later-milestone
wishes. Activate the next dependency-ready milestone without silently reopening
accepted decisions. A scope change requires human approval and invalidates only
affected downstream plans.

## Polish user-facing prose

Before presenting a plan for approval or a feature for acceptance, run
`$unslop` over the prose. It may improve wording and rhythm, but it must not
change facts, evidence classifications, citations, repository paths, commands,
identifiers, scope, acceptance criteria, risk status, or decisions. If clearer
wording exposes a contradiction, return to the owning stage instead of editing
the contradiction away.

## Internal role execution policy

Use the host's internal agent-launch capability and the installed
`omniskills-startup-team-*` profiles for `internal` mode. `visible_task` is the
narrow opt-in exception described above; it never changes the root/coordinator
model, global routing, public CLI dispatch, QA, evaluation, or acceptance.
Never call the removed public CLI dispatcher or reconnect its dormant runtime.
Give each role only its bounded, stage-specific packet and wait for its
completed Output Packet.

Human approval authorizes only the next declared lifecycle transition. Stop at
plan approval and feature acceptance. Launch no implementation before plan
approval and activate no later milestone before feature acceptance.

When internal launch is unavailable, or visible-task capability, exact model,
target/access, creation failure, creation reconciliation, or result collection
fails, label the handoff `Prepared, not executed` and name the failed boundary. Never claim that
a fallback handoff ran, and do not invent a model, runtime, receipt, run ID, or
result.

## Loop limits

- One active milestone at a time.
- One repair and one targeted review per milestone before human escalation.
- No forced transition past plan approval or feature acceptance.
- Stop for unavailable critical evidence, material goal drift, exhausted review
  limits, or any decision requiring new authority.
