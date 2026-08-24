---
name: grilled-product-dev
description: Use when turning a vague product request into an approved specification and vertical tickets.
---

# Grilled Product Dev

Use the Omniskills loop commands to start or resume the action-only run, inspect
the current action, log its result, and advance it.

Run exactly three phases:

1. `mattpocock:grilling`: ask one focused question with a recommended answer.
   Continue until the human says `direction ready`.
2. `mattpocock:to-spec`: publish the canonical specification and wait until
   the human says `spec approved`.
3. `mattpocock:to-tickets`: write dependency-aware vertical tickets and log
   `tickets written`.

If a dependency is missing, tell the user to run:

```bash
omniskill skills install mattpocock/skills
```
