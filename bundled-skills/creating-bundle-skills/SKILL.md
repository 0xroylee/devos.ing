---
name: creating-bundle-skills
description: Use when creating or editing an Omniskills workflow bundle with one callable entry skill.
---

# Creating Bundle Skills

Create the smallest repeatable workflow that solves one job.

1. Create `workflow.json`, `README.md`, and
   `skills/<workflow-name>/SKILL.md`.
2. Declare the callable entry skill and every companion skill in `skills[]`.
3. Add only the ordered phases users must understand to `steps[]`.
4. Make every `steps[].skill` exactly match a declared `skills[].source`.
5. Keep human gates explicit.
6. Run `omniskill lock`, `validate`, and `deps`.

A simple entry skill looks like this:

```markdown
---
name: workflow-name
description: Use when running the workflow-name Omniskills workflow.
---

# workflow-name

1. Use mattpocock:grilling to clarify one question at a time.
2. Run ./skills/custom-review and wait for approval.
3. Use mattpocock:to-tickets to create vertical tickets.
```

Declare the same sources in the manifest:

```json
{
  "skills": [
    { "source": "./skills/workflow-name" },
    {
      "source": "mattpocock:grilling",
      "repo": "https://github.com/mattpocock/skills/tree/5b15a47f2d7150f545fbcacbfe381787fc0230dc"
    },
    { "source": "./skills/custom-review" },
    {
      "source": "mattpocock:to-tickets",
      "repo": "https://github.com/mattpocock/skills/tree/5b15a47f2d7150f545fbcacbfe381787fc0230dc"
    }
  ]
}
```

Do not add a step for the entry skill. Do not create optional phases,
abstractions, or local skills until the workflow needs them.
