# Development Design Delivery Omniskills Workflow

Use `$development-design-delivery` when a product change has one uncertain
interface worth prototyping.

```text
Clarify -> Prototype -> Spec -> Tickets -> Implement -> Verify
```

Only the prototype and ticket set need approval. The entry skill skips the
prototype when no material interface uncertainty exists and invokes
`mattpocock:implement` only when commit permission is explicit.

```bash
bun run dev -- validate examples/workflows/development-design-delivery
bun run dev -- deps examples/workflows/development-design-delivery
bun run dev -- install examples/workflows/development-design-delivery
```
