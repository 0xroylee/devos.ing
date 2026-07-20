# Artifact Contract

| Artifact | Purpose | Content owner |
| --- | --- | --- |
| `AGENTS.md` | Rules, commands, and navigation | Repository owner; deliver-code owns only its marked section |
| `CONTEXT.md` | Canonical glossary only | Domain Modeling |
| `docs/adr/*` | Rationale for one qualifying durable decision | Domain Modeling |
| `docs/architecture.md` | Current boundaries, dependencies, and structure | Architecture/design phase |
| `docs/design/*` | Approved conceptual solution for one bounded change | Design phase |
| `docs/specs/*` | Approved behavior, scope, acceptance, seams, and non-goals | Spec phase |
| GitHub Issues or Scratch | Executable vertical ticket graph | Ticketing phase |
| Code and tests | Working behavior at approved public seams | Implement/TDD |
| Review evidence | Separate Standards and Spec findings | Code Review |
| Verification evidence | Fresh commands and requirement checklist | Verification |
| Sibling knowledge tree | Heavy research, sources, and experiments | Research-producing phase |

Specs and ADRs retain history through revision or supersession. Architecture is updated in place to describe current truth. Research never overrides an approved spec. Scratch state points to canonical artifacts instead of duplicating them.
