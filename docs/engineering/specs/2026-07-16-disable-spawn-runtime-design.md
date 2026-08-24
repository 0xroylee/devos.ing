# Disable Spawn Runtime From the Shipped CLI

## Status

Approved on 2026-07-16.

## Problem

The public `omniskill dispatch` and `omniskill dispatch resume` commands are no
longer registered, but the shipped CLI still imports and constructs the Codex
dispatcher. Team coordinator skills also continue to instruct users and agents
to call the unavailable dispatch commands. This leaves spawn code in the CLI
bundle and makes the installed coordinator contract disagree with the public
command surface.

The spawn execution path must be disconnected without removing Omniskills
workflow or team bundles.

## Goals

- Exclude agent dispatch, resume, and subprocess-launch wiring from the shipped
  CLI bundle.
- Ensure team coordinator skills never call `omniskill dispatch`,
  `omniskill dispatch resume`, or generic `spawn_agent`.
- Keep dormant dispatch runtime and adapter source modules available for a
  deliberate future restoration.
- Keep workflow and team bundle installation, skill dependencies, installed
  workflow records, agent-profile generation, orchestration tiers, and
  `setup-model-routing` available.
- Make the public documentation and tests describe the same disabled-spawn
  boundary.

## Non-goals

- Deleting the dispatch runtime, dispatcher adapter, or run-store source files.
- Removing orchestration metadata from manifests or installed agent profiles.
- Removing model-role selection, tier selection, or `setup-model-routing`.
- Removing workflow/team bundles or changing their install command.
- Adding a feature flag, environment variable, hidden command, or alternate
  spawn path.
- Automatically launching roles through another agent API.

## Chosen Approach

Disconnect spawn code from the production CLI graph while retaining its
standalone source modules and focused low-level tests.

This is preferable to a runtime feature flag because excluded code cannot be
activated accidentally and does not need to be loaded by normal CLI startup.
It is preferable to deleting the stack because the source remains available if
bounded-memory launch and resume behavior is designed and verified later.

## Runtime Boundary

### Shipped CLI

`src/cli.ts` must not import, construct, or pass a dispatcher. Building the
normal program must not initialize a Codex launch adapter.

`src/omniskill.ts` must not contain the dormant dispatch/resume command
registrar or its command execution helpers. Its public configuration options
must not accept dispatcher or run-store dependencies. The file remains the
boundary for bundle installation and model-routing configuration.

The plugin and runtime barrel files must not publicly re-export the dormant
dispatch adapter, run store, or dispatch runtime. Their direct source modules
remain in the repository for future work and may retain focused direct-import
tests.

The built `dist/cli.js` must not contain dispatch adapter/runtime markers such
as `createCodexCliDispatcher`, `Orchestration dispatch`, or dispatch-resume
command text.

### Preserved install behavior

`omniskill install` continues to:

1. load a workflow or team bundle;
2. resolve its skill dependencies;
3. derive supported Codex and Claude profile targets;
4. load orchestration and model-role configuration;
5. plan and install agent profiles; and
6. write the installed workflow/team record.

Profile generation is configuration, not spawning. It must not launch a child
process or create a dispatch run.

`setup-model-routing` remains public and continues to configure model IDs and
reasoning efforts used by generated profiles.

## Coordinator Contract

The startup, finance, and market team coordinators must stop after preparing
approved role handoffs. They must not launch agents directly or indirectly.

Each coordinator may still:

- clarify the goal and obtain approval;
- select the smallest relevant role set;
- name skipped roles and re-entry conditions;
- prepare one role brief per selected role;
- state the expected output, constraints, approval gate, and verification bar;
  and
- combine role outputs that the user later supplies.

Each coordinator must explicitly state that automatic role launch is
unavailable. A prepared handoff is not evidence that a role ran. The
coordinator must stop after presenting the handoffs unless the user provides
completed role outputs in a later interaction.

The contract must not disclose a runtime model, effort, adapter, evidence
capability, receipt, or run ID because no launch occurred.

## Documentation

Public team READMEs must remove runnable dispatch and resume examples. They
should explain that team bundles install coordinated skills and profile
configuration, while role execution is manual during the spawn-disable period.

Architecture documentation must distinguish these retained layers:

- bundle and skill installation;
- profile and model-routing configuration; and
- disabled agent-launch execution.

Historical design and implementation-plan documents remain unchanged because
they record earlier decisions rather than current user instructions.

## Test Strategy

The public seams are:

1. **CLI registration:** root help omits `dispatch`, and attempting the command
   is rejected as an unknown command.
2. **CLI dependency graph:** normal program construction has no dispatcher or
   run-store dependency.
3. **Build artifact:** a fresh production build excludes the known dispatch
   adapter, execution, and resume markers.
4. **Coordinator packages:** startup, finance, and market coordinator skills
   contain no `omniskill dispatch`, `dispatch resume`, or `spawn_agent`
   instruction and do contain the manual-handoff stop rule.
5. **Preserved bundle behavior:** startup-team validation and install dry-run
   still plan skill and agent-profile artifacts without launching a process.
6. **Regression gate:** the full repository check remains green.

Low-level tests that directly import dormant dispatch runtime, adapter, or run
store modules may remain. They preserve restoration knowledge but do not make
those modules part of the shipped CLI.

## Error Handling

There is no fallback spawn implementation. A user who invokes `dispatch` sees
the standard unknown-command error. A coordinator asked to run selected roles
returns prepared manual handoffs and clearly states that automatic launch is
disabled.

Install and model-routing errors continue to use their existing validation and
conflict behavior because those paths remain supported.

## Acceptance Criteria

- The normal CLI dependency graph has no dispatcher construction or run-store
  injection.
- `dispatch` and `dispatch resume` are absent from public help and rejected at
  runtime.
- The production bundle contains no dispatch adapter/runtime command markers.
- Startup, finance, and market coordinators cannot instruct automatic spawn or
  verified dispatch.
- Team documentation contains no runnable dispatch/resume command.
- Workflow/team install, profile planning, and model routing remain supported.
- Dormant dispatch source modules and focused low-level tests remain available
  through direct file imports only.
- Focused tests, CLI smoke checks, production build inspection, and
  `rtk bun run check` pass.

## Re-enable Gate

Restoring spawn requires a new approved design. That design must prove bounded
memory for launch and resume, define the supported runtime surface, restore
explicit public exports and CLI registration, update coordinator contracts,
and add fresh end-to-end receipt evidence. Dormant source alone is not approval
to re-enable the feature.
