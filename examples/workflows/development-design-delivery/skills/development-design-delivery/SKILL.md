---
name: development-design-delivery
description: Use when a product change needs one focused prototype before implementation.
---

# Development Design Delivery

Run this flow in order:

1. Use `mattpocock:grilling` one question at a time until the request is clear.
2. Use `mattpocock:prototype` only for a material API, module, or UI uncertainty.
   Wait for explicit approval of the selected direction.
3. Use `mattpocock:to-spec` to publish the approved specification.
4. Use `mattpocock:to-tickets` to create vertical tickets. Wait for explicit
   approval of the ticket set.
5. Use `mattpocock:implement` only when commit permission is explicit.
   Otherwise implement the approved ticket with `mattpocock:tdd` and do not
   commit. Use `mattpocock:diagnosing-bugs` only after an unexpected failure.
6. Run the repository's fresh verification commands and report the evidence.
   `mattpocock:code-review` is part of implementation closeout.

If a required Matt Pocock skill is missing, tell the user to run:

```bash
omniskill skills install mattpocock/skills
```

Do not expand scope or silently skip either approval gate.
