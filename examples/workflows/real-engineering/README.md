# Real Engineering Omniskills Workflow

A short engineering path:

1. Use the repository command wrapper.
2. Clarify one question at a time with `mattpocock:grilling`.
3. Publish the approved specification with `mattpocock:to-spec`.
4. Slice vertical tickets with `mattpocock:to-tickets`.
5. Implement only approved tickets with `mattpocock:implement`.

The workflow also installs Matt Pocock's `tdd`, `diagnosing-bugs`, and
`code-review` companion skills. It invokes `implement` only when commit
permission is explicit; otherwise it uses `tdd` without committing.

```bash
bun run dev -- validate examples/workflows/real-engineering
bun run dev -- install examples/workflows/real-engineering
```
