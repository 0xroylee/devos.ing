# Startup Team Omniskills Bundle

Use this team when one agent session needs a realistic startup operating bench
organized around a goal. It installs `$startup-goal` as the coordinator plus
role skills for CEO, CTO, product manager, web-design lead, engineering manager,
founding engineer, delegated deliver-code implementation, and QA lead, with the
companion skills those roles expect.

The flow starts with the native Goal Tunnel interview, asking one material
question at a time and including a recommended answer. The coordinator launches
selected internal subagents only after the requirement brief is approved, so
vague startup asks become clear goals, constraints, success criteria, and
bounded role packets before execution.

During planning, `$startup-goal` classifies selected roles by dependency and
submits every dependency-free role before it awaits results. It then uses one
all-settled fan-in: a failed role does not cancel healthy siblings, but every
required role must return a conforming packet before the plan can reach human
approval. The plan is synthesized in the captured pre-launch order, never the
order results happened to finish. Reviews and repairs that depend on another
role run only after that prerequisite.

Install it from the repo root:

```bash
bun run dev -- install examples/teams/startup-team
```

Validate it while authoring:

```bash
bun run dev -- validate examples/teams/startup-team
```

The checked-in `workflow.lock.json` fingerprints the complete local child graph
and every external locator. Refresh it whenever the coordinator, a child
workflow, or an external locator changes:

```bash
bun run dev -- lock examples/teams/startup-team
```

## Run one feature milestone at a time

Create `startup-goal-input.json` with the approved Goal Tunnel and ordered
milestones. For example:

```json
{
  "goalTunnel": {
    "goal": "Improve founder onboarding",
    "user": "A first-time founder",
    "problem": "The first useful action is unclear",
    "outcome": "The founder completes the first useful action",
    "scope": ["onboarding"],
    "nonGoals": ["billing"],
    "constraints": ["internal role execution requires a capable host"],
    "successCriteria": ["the first action is explicit and verified"],
    "assumptions": []
  },
  "milestones": [
    {
      "id": "first-action",
      "title": "Clarify the first action",
      "outcome": "The founder knows and completes the next action",
      "accountableRole": "product-manager",
      "dependencies": [],
      "acceptanceCriteria": ["the next action is explicit"]
    }
  ]
}
```

Use the loop commands to inspect and resume the active stage:

```bash
omniskill loop start examples/teams/startup-team --input-file startup-goal-input.json --json
omniskill loop status examples/teams/startup-team --latest --json
omniskill loop log examples/teams/startup-team --run <run-id> --type <expected-event> --metadata-file <packet.json> --json
omniskill loop advance examples/teams/startup-team --run <run-id> --json
```

The loop commands remain action-only; they inspect and persist lifecycle state
but do not launch a process. On a capable host, `$startup-goal` consumes the
action by launching selected installed profiles as internal subagents with
bounded stage packets. The user explicitly stops at plan approval before
implementation and feature acceptance after QA and evaluation. Between those
two gates, the accountable outcome role reconstructs the original expectations,
needs, wishes, and journey steps in a post-QA User Outcome Replay.

## Delegate the approved implementation boundary

After plan approval, `$startup-goal` sends the `deliver-code` child workflow a
bounded packet containing the approved Goal Tunnel, scope and non-goals,
acceptance criteria, permissions, immutable decisions, and plan approval
evidence. Deliver-code owns the implementation and one bounded in-scope rework
through TDD, code review, and fresh verification. It cannot expand the product
boundary: scope drift returns to planning and requires renewed human approval.

QA remains independently owned by `qa-lead`. User Outcome Replay and feature
acceptance remain owned by `$startup-goal`; installing deliver-code does not
collapse either human gate.

### Optional visible Luna xhigh implementation task

`internal` remains the default execution mode. A run-scoped `visible_task` is
available only after plan approval plus a separate explicit post-plan
confirmation; an ambiguous `approve` or `yes` does not create a task. The
confirmation shows `[startup-goal] Implement <milestone-id> — <milestone title>`,
the exact `gpt-5.6-luna` model, reasoning effort xhigh, project, filesystem
target, and workspace-write boundary.

Before confirmation or creation, the coordinator calls `list_projects`; the
selected returned opaque project identity must resolve the visible task target.
For Git projects, it defaults to an isolated worktree,
using `startingState: working-tree` when approved work depends on
uncommitted changes. Direct current-checkout use requires explicit choice. The
coordinator creates exactly one visible task per milestone, reuses its task ID
and workspace reference for the one bounded correction and permitted rework,
and starts QA only after the result and exact workspace identity validate.
Capability, exact-model, target/access, creation failure, reconciliation, or result-collection
failure is `Prepared, not executed` with the failed boundary named. The root
model and global routing remain unchanged; public CLI dispatch stays disabled.

## Model orchestration

The default install compiles the team's vendor-neutral `deep`, `standard`, and
`fast` assignments into global profiles. The checked-in team also labels each
assignment with one of three model roles:

- `planning` for `$startup-goal`, strategy, product, design, architecture,
  management, founding-engineer framing, and support exploration.
- `implementation` for delegated `deliver-code` workspace-write execution.
- `verification` for `../../workflows/qa-lead`.

Use `$setup-model-routing` to configure global Codex CLI model and effort
selections for those labels. The skill drives these deterministic commands:

```bash
omniskill setup-model-routing --list-models --json
omniskill setup-model-routing \
  --planning-model <slug> --planning-effort <effort> \
  --implementation-model <slug> --implementation-effort <effort> \
  --verification-model <slug> --verification-effort <effort> \
  --dry-run --json
omniskill setup-model-routing \
  --planning-model <slug> --planning-effort <effort> \
  --implementation-model <slug> --implementation-effort <effort> \
  --verification-model <slug> --verification-effort <effort> \
  --apply --json
```

`--list-models` prints only Codex models that the signed-in identity exposes as
visible choices; hidden catalog entries are not valid setup candidates.

`startup-team` installs that setup skill from the checked-out repository via
`../../workflows/setup-model-routing/skills/setup-model-routing`, so local
dependency and install smoke tests do not require the public
`setup-model-routing` workflow alias to exist yet. The public
`setup-model-routing` workflow remains independently installable from
`examples/workflows/setup-model-routing`.

The setup command updates `~/.omniskills/orchestration.json`, managed Codex
profiles for installed labeled teams, and the matching installed workflow
records in one rollback-protected transaction. Schema `0.1` config files remain
valid; schema `0.2` stores the global `planning`, `implementation`, and
`verification` Codex selections. Codex profiles use those model-role selections;
Claude profiles continue to use their configured tiers.

Preview every skill and profile destination without writing:

```bash
bun run dev -- install examples/teams/startup-team --dry-run
```

When the host's agent-launch capability and the requested installed profiles are
available, the coordinator launches the smallest selected role set as internal
subagents in the current task, submits independent planning roles before
waiting, then validates their Output Packets without prescribing their methods
or conclusions. Host capacity determines actual concurrency. If launch
capability or a requested profile is unavailable, it returns the same bounded
brief labeled `Prepared, not executed` and stops without claiming the role ran;
this is an honest handoff, not evidence of execution.

Installation still creates managed Codex and Claude profiles and preserves
model-role configuration. Profile generation does not itself launch a role or
create run state, and the removed public CLI dispatch path stays disabled.

Profiles are namespaced with `omniskills-startup-team-`. Reinstall updates only
unchanged managed profiles; removal keeps user-modified profiles and always
preserves the shared orchestration configuration.

The existing removal contract is unchanged:

```bash
omniskill remove startup-team --home ~ --dry-run
```

The skill cannot change the model of an already-running root session. Codex
receives a live profile smoke check in this repository; Claude output is
statically validated unless Claude Code is installed separately.
