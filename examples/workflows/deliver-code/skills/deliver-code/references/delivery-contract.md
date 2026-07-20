# Delivery Contract

## Direct request

- repository path;
- requested coding outcome;
- known constraints and permissions;
- existing requirement, issue, or spec when available.

## Delegated packet

- `mode: delegated`;
- source coordinator and milestone ID;
- approved Goal Tunnel reference or snapshot;
- approved scope, non-goals, and acceptance criteria;
- implementation-plan boundary;
- repository context and permissions;
- immutable prior decisions;
- human plan-approval evidence before implementation.

## Plan approval package

- mode and immutable scope;
- selected and skipped stages with re-entry conditions;
- acceptance criteria and approved test seams;
- artifact changes;
- vertical tickets, blockers, and ready frontier;
- review fixed point and Standards/Spec sources;
- verification commands;
- risks and unresolved evidence;
- Mutation envelope with separate booleans for code edits, issue publication, commits, and other external actions.

## Scope delta

- inherited requirement or decision;
- contradictory evidence or newly required product behavior;
- consequence of continuing unchanged;
- smallest upstream decision required;
- affected downstream artifacts.

## Result evidence

- implemented ticket and changed artifacts;
- focused and full verification commands with fresh results;
- Standards findings and Spec findings kept separate;
- residual risk and untested areas;
- exact accept, repair, or upstream re-entry recommendation.

## State record

Create `.scratch/deliver-code/<work-id>/state.json` before drafting the plan and update it after every transition:

```json
{
  "schemaVersion": "0.1",
  "mode": "direct",
  "workId": "stable-kebab-case-id",
  "activeStage": "planning",
  "activeTicket": null,
  "selectedStages": [],
  "skippedStages": [],
  "gate": "awaiting_plan_approval",
  "approvalEvidence": null,
  "mutationEnvelope": {
    "codeEdits": false,
    "issuePublication": false,
    "commits": false,
    "otherExternalActions": []
  },
  "tracker": {
    "kind": "scratch",
    "pendingPromotion": false
  },
  "artifacts": [],
  "lastVerification": null
}
```

Allowed stages are `preparing`, `planning`, `awaiting_plan_approval`, `implementing`, `reviewing`, `verifying`, and `awaiting_acceptance`. Store paths and evidence pointers, not copied spec or review bodies.
