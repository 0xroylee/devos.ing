# Grilled Product Dev Omniskills Workflow

Use `$grilled-product-dev` to turn a vague product request into an approved
specification and dependency-aware vertical tickets.

```text
Clarify one question -> Approve direction -> Write spec -> Approve spec -> Write tickets
```

The goal loop is action-only. It records progress under
`~/.omniskills/runs/grilled-product-dev/<run-id>/`; the agent still performs
each action.

```bash
bun run dev -- validate examples/workflows/grilled-product-dev
bun run dev -- deps examples/workflows/grilled-product-dev
bun run dev -- install examples/workflows/grilled-product-dev
bun run dev -- loop start examples/workflows/grilled-product-dev --json
```
