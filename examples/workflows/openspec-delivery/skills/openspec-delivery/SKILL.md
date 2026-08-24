---
name: openspec-delivery
description: Use when delivering an approved OpenSpec change through implementation and archive.
---

# OpenSpec Delivery

Run this flow in order:

1. Use `opsx-handoff-review` to create the OpenSpec proposal, specs, and tasks.
2. Wait for explicit approval of `proposal.md`.
3. Use `mattpocock:codebase-design` to check the affected boundary.
4. Use `mattpocock:to-tickets` to create vertical tickets and wait for
   explicit approval of the ticket set.
5. Use `mattpocock:implement` only when commit permission is explicit.
   Otherwise implement the approved ticket with `mattpocock:tdd` and do not
   commit. Use `mattpocock:diagnosing-bugs` only after an unexpected failure;
   implementation closeout uses `mattpocock:code-review`.
6. Collect fresh verification evidence, then use `opsx-handoff-review` to
   archive the change after explicit approval.

If a Matt Pocock dependency is missing, tell the user to run:

```bash
omniskill skills install mattpocock/skills
```
