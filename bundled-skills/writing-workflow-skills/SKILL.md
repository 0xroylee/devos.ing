---
name: writing-workflow-skills
description: Use when writing or reviewing Omniskills entry skills, local role skills, gates, and handoffs.
---

# Writing Workflow Skills

Use `creating-bundle-skills` for the whole bundle. Use this skill to keep one
entry skill and its local companions aligned with `workflow.json`.

## Dependency Palette

| Need | Matt Pocock skill |
| --- | --- |
| Clarify one question at a time | `mattpocock:grilling` |
| Sharpen terminology and decisions | `mattpocock:grill-with-docs` |
| Publish the approved specification | `mattpocock:to-spec` |
| Slice vertical tickets | `mattpocock:to-tickets` |
| Prototype an uncertain interface | `mattpocock:prototype` |
| Implement approved work | `mattpocock:implement`, `mattpocock:tdd` |
| Diagnose or review | `mattpocock:diagnosing-bugs`, `mattpocock:code-review` |

Declare every selected dependency. Keep model-invoked companion skills such as
`tdd` and `code-review` installed even when a top-level `implement` step
invokes them.

## Entry Skill Contract

An entry skill should state:

1. The approved input it needs.
2. The shortest ordered flow.
3. Each human approval gate and stop condition.
4. What happens when a dependency or execution capability is missing.
5. The final evidence, residual risk, and next action.

A local role skill owns one decision or artifact. It should return only:

```markdown
- Decision:
- Evidence:
- Risk:
- Handoff:
```

Keep the skill name aligned with its folder and manifest source. Use exact
dependency names, never silently skip a gate, and do not restate the whole
workflow inside every local role.
