# Looped Workflow Runtime Design

## Goal

Add an optional loop runtime to Omniskills workflow bundles so an installed
entry skill can resume a workflow, report the current phase, log progress, and
summarize prior work without hiding command or tool execution from the agent.

## Non-Goals

- Do not add a hidden executor in v1.
- Do not require every workflow bundle to use a loop.
- Do not introduce npm dependencies, Bun runtime APIs, or TypeScript execution
  requirements for `loop.mjs`.
- Do not make `omniskill validate` write generated files.

## Chosen Approach

Use a per-workflow `loop.mjs` with a shared command and state contract.

Each workflow can customize its own loop behavior, but v1 standardizes the
subcommands, global state layout, structured event log, JSON output shape, and
action-only execution model. This keeps looped workflows portable while avoiding
a large core runtime before the workflow behavior has been proven.

## Workflow Layout

A looped workflow bundle has this source layout:

```text
examples/workflows/grilled-product-dev/
  workflow.json
  loop.mjs
  README.md
  skills/
    grilled-product-dev/
      SKILL.md
```

`loop.mjs` lives beside `workflow.json` and discovers that manifest by default.
It can accept `--workflow-json <path>` only for tests and debugging.

## Manifest Changes

`workflow.json` gains optional loop metadata:

```json
{
  "loop": {
    "script": "./loop.mjs",
    "state": "global",
    "execution": "action-only"
  }
}
```

`skills[]` gains an optional `entry` flag:

```json
{
  "skills": [
    { "source": "./skills/grilled-product-dev", "entry": true },
    { "source": "mattpocock:grilling" },
    { "source": "mattpocock:grilling" },
    { "source": "mattpocock:to-tickets" }
  ]
}
```

`steps[]` gains an optional plain-text `instruction` field:

```json
{
  "id": "grilling",
  "skill": "mattpocock:grilling",
  "gate": "human_approval",
  "instruction": "Ask one grilling question, include your recommended answer, and wait for explicit human approval before advancing."
}
```

Plain workflows may omit `loop`, `skills[].entry`, and `steps[].instruction`.
Looped workflows require exactly one `skills[]` entry with `entry: true`.

## Runtime Contract

`loop.mjs` is run with Node:

```bash
node loop.mjs start
node loop.mjs status --run <id>
node loop.mjs status --latest
node loop.mjs log --run <id> --type <event-type> --message "..."
node loop.mjs advance --run <id>
node loop.mjs advance --run <id> --to <step> --force --reason "..."
node loop.mjs summary --run <id>
```

Every command supports `--json`. Default output is human-readable.

V1 behavior:

- `start` creates a new run and fails if the requested run id already exists.
- Run ids are generated as `YYYYMMDD-HHMMSS-<workflow-name>`.
- `status --run <id>` returns the current step and exact next instruction.
- `status --latest` selects the newest active run for the workflow and prints
  the selected run id clearly.
- Plain `status` without `--run` or `--latest` fails with a helpful message.
- `log` appends structured JSONL events.
- `advance` moves only to the next step by default.
- `advance --to <step> --force --reason "..."` allows manual recovery and logs
  a `force_advance` event.
- `summary` writes a mechanical summary derived from structured events.
- The script never executes shell commands, network calls, tools, or
  agent-specific actions in v1.

## Global Run State

Runs are stored globally:

```text
~/.omniskills/runs/<workflow>/<run-id>/
  state.json
  events.jsonl
  summary.md
```

Multiple active runs are allowed for the same workflow.

`state.json` stores the current step, workflow name, run id, workspace context,
and timestamps. Workspace context should include at least `cwd`; git branch and
commit can be recorded when available.

`events.jsonl` stores structured events. V1 event types:

```text
start
status
question
answer
approval
phase_result
error
summary
advance
force_advance
complete
```

Each event line uses this shape:

```json
{
  "timestamp": "2026-07-05T12:00:00.000Z",
  "type": "approval",
  "step": "grilling",
  "message": "User approved the grilled direction",
  "metadata": {
    "approvedBy": "human"
  }
}
```

`summary.md` is a basic generated summary containing the current step,
completed steps, approvals, errors, force advances, latest phase result, and
next action. The agent may improve the prose, but v1 should not pretend to do
semantic summarization.

## Installed Skill Layout

Install copies loop runtime files only into the entry skill folder:

```text
~/.agents/skills/grilled-product-dev/
  SKILL.md
  workflow.json
  loop.mjs
  loop.metadata.json
```

Dependency skills receive only their normal skill files.

`workflow.json` is copied as the full original manifest. This avoids a second
runtime-manifest format and makes installed skills easy to inspect.

`loop.metadata.json` is generated from `workflow.json` during install:

```json
{
  "schemaVersion": "0.1",
  "workflow": "grilled-product-dev",
  "entrySkill": "./skills/grilled-product-dev",
  "loopScript": "./loop.mjs",
  "state": "global",
  "execution": "action-only",
  "commands": ["start", "status", "log", "advance", "summary"]
}
```

The metadata file is a local discovery and debugging note. The richer installed
workflow record remains the source of truth.

## Skill Runtime Pattern

Loop-enabled entry skills instruct agents to call the loop before every phase:

```text
1. node loop.mjs status --run <run-id>
2. Follow the returned next action.
3. Do the phase work.
4. node loop.mjs log --run <run-id> --type phase_result --message "..."
5. node loop.mjs advance --run <run-id>
6. Repeat until complete.
```

This pattern gives the workflow real resumability instead of a one-time startup
checklist.

## Validation

`omniskill validate` stays read-only.

It validates:

- `loop` is optional.
- If `loop` exists, exactly one `skills[]` item has `entry: true`.
- If `loop` exists, the entry skill is a local path.
- `skills[].entry` appears at most once.
- `loop.script` is a relative `.mjs` path.
- `loop.script` exists and stays inside the workflow bundle.
- `loop.state` is `"global"` in v1.
- `loop.execution` is `"action-only"` in v1.
- `steps[].instruction`, when present, is plain text.
- Existing workflows without `loop` continue to validate.

## Installation

`omniskill install` continues to write the global installed workflow record:

```text
~/.omniskills/workflows/<workflow>.json
```

For looped workflows, installation also copies these files into the installed
entry skill destination:

- `workflow.json`
- `loop.mjs`
- generated `loop.metadata.json`

The install path must work for local workflow sources and GitHub workflow
sources, including sources that were cloned to a temporary directory during
installation. The installed skill must not depend on the original source path.

## Testing

Add focused Bun tests around:

- Loop manifest validation success.
- Missing entry skill when `loop` exists.
- Multiple `entry: true` skills.
- Non-local entry skill with `loop`.
- Invalid `loop.script` values: absolute path, escaping path, non-`.mjs`, and
  missing file.
- `steps[].instruction` survives manifest parsing.
- Install copies `workflow.json`, `loop.mjs`, and generated
  `loop.metadata.json` only into the entry skill.
- Plain workflows still validate and install without loop files.

Add a smoke check for a looped example workflow:

```bash
rtk bun run dev -- validate examples/workflows/grilled-product-dev
rtk bun run dev -- deps examples/workflows/grilled-product-dev
rtk node examples/workflows/grilled-product-dev/loop.mjs start --json
rtk node examples/workflows/grilled-product-dev/loop.mjs status --latest --json
```

## Roadmap

V1:

- Manifest fields: `loop`, `skills[].entry`, `steps[].instruction`.
- Per-workflow `loop.mjs`.
- Node-only, dependency-free runtime.
- Subcommands: `start`, `status`, `log`, `advance`, `summary`.
- Global run state under `~/.omniskills/runs/<workflow>/<run-id>/`.
- Read-only validation.
- Install copies loop files into the entry skill and generates
  `loop.metadata.json`.
- No hidden execution.

V1.1:

- Better `summary.md` formatting.
- `--latest` active-run selection polish.
- More helpful validation errors.
- Example looped workflow in `examples/workflows/grilled-product-dev`.

V2:

- Structured suggested actions while still action-only.
- More gate types: `spec_review`, `tests_passed`, `manual_continue`.

V3:

- Optional auditable executors behind explicit opt-in adapters.
