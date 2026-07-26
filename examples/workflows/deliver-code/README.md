# Deliver Code Omniskills Workflow

Use `$deliver-code` to scaffold durable project context and deliver one approved
vertical coding slice at a time.

## Install and invoke

```bash
bun run dev -- install examples/workflows/deliver-code
```

Restart the target agent, then invoke:

```text
$deliver-code implement this coding change
```

The first explicit direct invocation safely creates or reconciles `AGENTS.md`,
`CONTEXT.md`, architecture, ADR, design, spec, Scratch, and sibling knowledge
locations. It preserves existing content and stops on incompatible paths.

## Adaptive flow

```text
Grill -> Domain Modeling -> Spec -> Vertical Tickets
      -> Implement/TDD -> Code Review -> Verification
```

Clear small fixes may reuse an approved request and one work item. Testing,
Standards and Spec review, and fresh verification never disappear. The quality
target is meaningful behavioral confidence; 90% line coverage is sufficient,
and the workflow never chases 100% with low-value tests.

Fresh checks use native verification evidence from
`scripts/verification-evidence.mjs`. The helper records command availability,
timestamps, exit codes, a workspace fingerprint, delegated implementation
metadata, and requirement-to-evidence mappings. Failed, partial, stale,
unavailable, or mismatched evidence stays blocked; only a full pass can support
a completion claim.

## Permissions

Scaffold setup does not authorize code changes, GitHub Issue publication, or
commits; it does not authorize commits separately from the explicit Mutation
envelope. The plan approval package names each permitted mutation separately.
The upstream `implement` skill commits by default, so deliver-code invokes it
only when commit permission is explicit.

## Storage

- Canonical specs: `docs/specs/`
- Domain language: `CONTEXT.md`
- Durable decisions: `docs/adr/`
- Local ticket fallback and resume state: `.scratch/deliver-code/<work-id>/`
- Heavy research: sibling `<repo-name>.knowledge/`

GitHub Issues are preferred when configured and authorized. Scratch tickets use
stable IDs and pending-promotion metadata so later synchronization does not
duplicate work.

## Validate

```bash
bun run dev -- validate examples/workflows/deliver-code
bun run dev -- deps examples/workflows/deliver-code
```
