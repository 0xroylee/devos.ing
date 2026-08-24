# Startup Team Landing Redesign

**Status:** Approved design; awaiting written-spec review  
**Date:** 2026-07-16

## Summary

Redesign the public homepage around Startup Team as the flagship Omniskills
skill set. The page adopts the warm editorial pacing, audience-led storytelling,
large product statements, illustrated capability catalog, and progressive proof
structure of [AgentKey](https://agentkey.app/) while keeping Omniskills branding,
copy, illustrations, interactions, and implementation original.

The homepage must answer four questions within the first screen and first two
scrolls:

1. Who is Startup Team for?
2. What can they achieve with it?
3. Which agent environments can install it?
4. What capabilities does the skill set provide?

The approved direction is audience-first editorial. Startup Team leads the
story; Finance Team, Market Team, workflows, and canonical skills remain
available later in the existing catalog.

## Approved Requirement Brief

### Goal

Make Startup Team understandable and installable from one polished homepage,
with an original AgentKey-inspired visual language and evidence-backed product
claims.

### Customers

- Solo founders moving from an idea to a shipped product without every
  specialist in-house.
- Developers who want requirements, design, architecture, implementation, and
  verification connected in one accountable workflow.
- Startup teams that need shared decisions, explicit approval gates, specialist
  handoffs, and release evidence.

### Problem

The current homepage leads with the general orchestration system and catalog.
It does not quickly explain which customers should choose Startup Team, the
outcomes they can produce, the agent environments that can install the skills,
or the complete capability set behind `$startup-goal`.

### Scope

- Redesign the homepage and shared header/footer.
- Add real Hermes and OpenClaw skill-install targets before advertising them.
- Keep existing team and workflow detail routes functionally unchanged.
- Preserve Startup Team as the installable package and `$startup-goal` as its
  callable coordinator.
- Preserve the existing Team and Skill Hub as a secondary discovery surface.

### Non-goals

- Pricing, accounts, login, subscription, or payment flows.
- Testimonials, user counts, popularity ranks, or install telemetry without real
  data.
- Fake live execution or browser-side agent execution.
- Redesigning workflow and team detail pages in this delivery.
- Implementing verified orchestration dispatch adapters for every supported
  skill-install target. Verified dispatch receipts remain Codex CLI-only in v1.
- Marketing volatile model IDs on the homepage.

## Relationship To Existing Contracts

This design supersedes the homepage-specific product story, reference direction,
layout, visual-system, and motion sections in `landing/design.md`. Implementation
must update that file so the active landing contract matches the delivered page.

The following contracts remain unchanged:

- `startup-team` is installed from `examples/teams/startup-team`.
- `$startup-goal` remains the coordinator and callable entry skill.
- The seven operating members remain CEO, CTO, product manager, web design,
  engineering manager, founding engineer, and QA lead.
- Existing team/workflow detail routes and the Team/Skill Hub content model stay
  authoritative.
- Landing components do not import root runtime code or read generated
  `.omniskills` state.

## Information Architecture

The homepage uses this order on mobile and desktop:

1. **Navigation** — Omniskills brand, `Who it’s for`, `Showcase`,
   `Capabilities`, `How it works`, and GitHub; persistent install action where
   space permits.
2. **Hero** — Startup Team promise, primary install command, and secondary
   GitHub action.
3. **Supported Agents** — seven local logo assets with precise compatibility
   wording.
4. **Who It Is For** — tabs for Solo Founders, Developers, and Startup Teams.
5. **Flagship Showcase** — deterministic idea-to-verified-feature simulation.
6. **Capabilities** — six outcome-first illustrated capability cards.
7. **How It Works** — install, invoke, approve and ship.
8. **Explore More** — preserve the existing featured teams and Skill Hub as the
   secondary catalog.
9. **FAQ** — compatibility, judgment, skill inspection, and lazy routing.
10. **Final CTA and footer** — repeat the install command, source link, and
    repository/docs navigation.

## Hero And Conversion

The hero leads with:

> From rough idea to verified release.

Supporting copy states that Startup Team coordinates strategy, product, design,
engineering, and QA for solo founders, developers, and startup teams.

The primary conversion is a whole-target, click-to-copy command:

```bash
npx omniskill@latest install startup-team
```

The secondary action is `View on GitHub`. Copy success uses the existing
accessible clipboard feedback and never changes the command shown to the user.

## Supported Agent Contract

The visual section is labeled **Supported Agents**, not Supported Models. It
shows, in this order:

1. Cursor
2. Codex
3. Claude
4. OpenCode
5. Hermes
6. OpenClaw
7. GitHub Copilot

Logos are stored locally. Existing assets for Cursor, Codex/OpenAI, Claude, and
GitHub Copilot are reused. OpenCode, Hermes, and OpenClaw assets must come from
their official project or brand sources. Record source and license information
in `landing/ATTRIBUTIONS.md`. If an official logo cannot be verified for reuse,
render the agent name in a neutral branded tile instead of inventing a mark.

The section copy distinguishes two capabilities:

- All seven are supported skill-install targets.
- Verified tier/model-role dispatch receipts remain Codex CLI-only in v1.

The FAQ repeats this distinction so the logo rail does not imply identical
native orchestration adapters.

### Hermes target

Add canonical skill target `hermes`, writing skill directories under
`~/.hermes/skills/<skill-name>`. Hermes documents `~/.hermes/skills/` as its
primary skill source and supports the AgentSkills `SKILL.md` format in its
[official skills-system guide](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/skills.md).

### OpenClaw target

Add canonical skill target `openclaw`, writing skill directories under
`~/.agents/skills/<skill-name>`. OpenClaw documents `~/.agents/skills` as a
personal agent-skill root in its
[official skills documentation](https://github.com/openclaw/openclaw/blob/main/docs/tools/skills.md).
Because Codex, OpenCode, GitHub Copilot, and OpenClaw can share this destination,
one install/update operation must deduplicate the physical write while still
reporting each requested target.

### CLI surface

- `skills install` and `skills update` accept `hermes` and `openclaw`.
- Help and example command output list all seven canonical targets.
- Existing target aliases remain valid.
- Removal and ownership behavior stays consistent with other directory targets.
- Focused tests cover parsing, destination selection, shared-destination
  deduplication, dry runs, install, update, and help output.

## Audience Stories

The section uses real ARIA tabs with one persistent panel per audience. Arrow
Left/Right wraps, Home/End jumps to the boundary, and tab selection updates the
showcase without changing page position.

### Solo Founders

**Promise:** move from idea to shipped product without pretending every
specialist is in-house.

- Pressure-test a product idea.
- Turn decisions into an approval-ready build brief.
- Ship with interface and QA checks.

### Developers

**Promise:** start implementation with clearer decisions and finish with stronger
evidence.

- Convert a rough request into acceptance criteria.
- Surface architecture and interface risks before editing.
- Implement the approved slice and verify regressions.

### Startup Teams

**Promise:** keep product, design, engineering, and QA aligned through visible
handoffs.

- Establish one shared requirement brief.
- Route only the specialists the work needs.
- Record decisions, approvals, risks, and verification evidence.

## Flagship Showcase

The existing deterministic Startup Goal workbench is retained and restyled. The
active scenario demonstrates:

```text
rough product idea
  -> clarification interview
  -> requirement brief approval
  -> route approval
  -> product and web-design framing
  -> implementation
  -> QA verification
  -> combined decision log
```

The default prompt is:

> Build an onboarding flow that gets a new user to first value in under two
> minutes.

The demo is explicitly labeled `Simulated run`. It does not claim live agent
execution, elapsed time, token use, install counts, or success metrics. It
autoplays once when sufficiently visible, pauses when the document is hidden,
and exposes Replay. Reduced motion shows the completed flow without timers.

## Capabilities And Illustrations

Every item is outcome-first and includes one original inline SVG illustration.
Each illustration has one meaningful moving element and a complete static state.

| Capability | Outcome | Illustration metaphor |
| --- | --- | --- |
| Strategy & validation | Challenge assumptions and make a defensible direction decision. | Competing signals orbit and resolve into one route. |
| Product requirements | Produce clear scope, acceptance, and approval-ready requirements. | Loose inputs settle into an ordered document stack. |
| Interface design | Shape responsive hierarchy, interaction, accessibility, and motion. | Interface regions assemble inside a product frame. |
| Architecture & implementation | Expose technical risk and execute the approved build slice. | Bounded modules connect and activate along one path. |
| QA & release verification | Check acceptance, regressions, responsiveness, and release behavior. | A verification shield closes after checks complete. |
| Approval gates & handoffs | Keep decisions and accountable roles visible throughout the run. | Work crosses a visible gate between two role nodes. |

The illustrations are geometric and diagrammatic. They must not use stock art,
generic decorative gradients, fake dashboards, or vendor imagery.

## Visual System

- **Canvas:** warm off-white paper.
- **Text:** near-black ink, high-contrast body copy, and restrained muted text.
- **Typography:** an editorial serif stack for primary statements; Geist Sans
  for explanatory and interface text; monospace only for commands and skill
  identifiers.
- **Color:** a neutral foundation with soft lavender for planning, soft green
  for verification, warm amber for implementation, and lime only for active or
  completed signals.
- **Surfaces:** full-width unframed sections; bordered cards only for audience
  proof, capability items, terminal/workbench content, and final conversion.
- **Shape:** large rounded demonstration fields and smaller controlled radii for
  product controls.
- **Atmosphere:** soft bounded color fields may support the hero and
  illustrations; no animated bokeh, parallax, or ambient loops.
- **Originality:** match the reference page’s confidence, spacing rhythm, and
  progressive proof structure without copying its wording, icons, illustrations,
  brand colors, source code, or proprietary assets.

## Component And Data Boundaries

`landing/lib/landing-content.ts` remains the single visible-content source. Add
typed data for:

- supported agents and compatibility detail;
- audience stories and outcome bullets;
- capability copy and illustration identifiers;
- usage steps;
- FAQ items;
- primary and secondary calls to action.

`landing/components/landing-page.tsx` remains a thin section composer. Use
focused presentation boundaries for:

- Startup Team hero;
- supported-agent strip;
- audience showcase;
- workflow-run demo;
- capability grid and illustration registry;
- usage steps;
- FAQ;
- final CTA.

The existing featured-team and Skill Hub boundaries remain intact and move
later in the composition. Illustration selection uses a closed identifier union
and a local renderer; content data does not store arbitrary component instances.

No new animation, illustration, carousel, or state-management dependency is
needed.

## Interaction And Motion

- Audience tabs use native tab semantics and keyboard behavior.
- Commands are whole-target click-to-copy controls with `Copy` and `Copied`
  feedback.
- Capability illustrations animate once when they enter the viewport.
- Audience-panel changes use a short opacity and spatial transition.
- The workbench begins only when visible, pauses with document visibility, and
  replays only on explicit request.
- Fine-pointer hover may lift an interactive item by at most a few pixels; touch
  and keyboard behavior never depends on hover.
- Reduced motion removes translation, pulse, stagger, and scheduled progress,
  while preserving immediate state and short color feedback.
- No infinite motion, `transition: all`, layout-property animation, or hidden
  content before hydration.

## Responsive Rules

### 320px

- Navigation collapses without hiding the install path.
- Hero actions stack and commands wrap without horizontal overflow.
- Agent logos become compact tiles and wrap.
- Audience proof, workbench lanes, capabilities, usage steps, and catalog rows
  use one column.
- DOM order remains goal, coordinator, specialists, implementation,
  verification, result.

### 768px

- Audience proof may use two columns.
- Capabilities use two columns.
- The workbench may use a compact rail plus transcript if both remain readable.

### 1440px

- Content width remains bounded and centered.
- Capabilities use three columns.
- Hero copy does not stretch into long lines.
- Full navigation and install action remain visible.

## Error And Fallback Behavior

- GitHub star fetch failure keeps the existing stable fallback label.
- Clipboard API failure preserves selectable command text and announces that the
  command should be copied manually.
- A missing or unusable logo falls back to the agent name in the same tile.
- JavaScript-disabled output keeps the hero, agent list, first audience story,
  capability content, usage steps, catalog, and install command readable.
- Intersection Observer absence renders illustrations and the workbench in their
  completed static state.
- Unsupported target names continue to fail with the existing validated error
  path; the two new canonical names are added explicitly rather than accepted by
  a broad string fallback.

## FAQ Behavior

The FAQ uses accessible disclosure buttons with `aria-expanded` and associated
answer regions. Only the four approved questions appear:

1. Does Startup Team replace my judgment?
2. Which agents are supported, and which features differ by agent?
3. Can I inspect every included skill?
4. Does every goal run every specialist role?

Answers state that the human retains approval authority, skills remain
inspectable, the coordinator routes the smallest safe role set, all seven
targets install skills, and verified dispatch receipts remain Codex CLI-only in
v1. The answers are present in server-rendered markup even when collapsed so
JavaScript failure does not remove essential information.

## Accessibility

- Preserve logical heading order and landmark structure.
- Every logo has an accessible agent name; decorative illustration paths are
  hidden while each card retains a text description.
- Tabs expose selected state, linked tabpanels, and predictable focus movement.
- Copy feedback uses a polite live region.
- Focus indicators remain visible against warm, dark, and colored surfaces.
- Text and controls meet WCAG AA contrast.
- Motion is never required to understand process or status.

## Verification

### Focused runtime tests

```bash
rtk bun test tests/cli.test.ts
rtk bun test tests/skill-installer.test.ts
```

These tests must cover Hermes and OpenClaw parsing, paths, shared destination
deduplication, help text, dry-run output, install, and update behavior.

### Focused landing tests

```bash
rtk bun test tests/landing-app.test.ts tests/landing-skill-hub.test.ts
```

Source-contract coverage requires the approved audience labels, all seven
supported-agent names, capability names, install command, simulated-run label,
secondary catalog, and absence of prohibited telemetry or stale hero copy.

### Landing package

```bash
cd landing && rtk bun run typecheck
cd landing && rtk bun run build
```

### Browser smoke

Verify at 320px, 768px, and 1440px:

- no overlap or horizontal overflow;
- install and GitHub actions;
- audience tab mouse and keyboard interaction;
- copy feedback and fallback;
- workbench autoplay, Replay, visibility pause, and reduced motion;
- capability illustration static and animated states;
- supported-agent logo and text fallback;
- Team/Skill Hub discovery and existing detail-route navigation.

### Full repository gate

```bash
rtk bun run check
```

## Acceptance Criteria

- A new visitor can identify the three intended audiences, flagship outcome,
  supported agents, and primary install action within five seconds.
- Startup Team is the dominant homepage story while the broader catalog remains
  discoverable.
- All six capability items have distinct original illustrations and accurate
  outcome copy.
- Cursor, Codex, Claude, OpenCode, Hermes, OpenClaw, and GitHub Copilot appear
  with accessible local logo tiles.
- Hermes and OpenClaw are real, tested skill-install targets before the homepage
  calls them supported.
- The page clearly states that verified dispatch receipts remain Codex CLI-only
  in v1.
- Commands copy exactly the visible string.
- Audience tabs, copy controls, FAQ controls, and demo controls work with
  keyboard, touch, and visible focus.
- Reduced-motion and JavaScript fallback states retain all essential content.
- Focused tests, landing typecheck/build, browser smoke, and full repository
  verification pass.

## Risks And Rollback

- **Unsupported-agent overclaim:** gate logo copy on real target support and
  distinguish skill installation from verified dispatch adapters.
- **Reference imitation:** use the approved information rhythm and mood while
  retaining original content, illustrations, code, and assets.
- **Homepage/catalog conflict:** keep the Team/Skill Hub intact below the
  Startup Team narrative and guard discovery routes in tests.
- **Mixed-worktree damage:** snapshot every mutation, edit only scoped files,
  stage narrowly, and never discard unrelated changes.
- **Brand-asset uncertainty:** prefer verified official assets; use text fallback
  when reuse rights are unclear.
- **Motion regressions:** keep complete static markup and test reduced-motion and
  missing-observer behavior.

Rollback is split by purpose:

1. Revert the homepage redesign and restore the prior `landing/design.md`
   contract while leaving runtime target support intact if it is already useful.
2. Revert Hermes/OpenClaw target support separately if installer verification
   fails; remove their logos and supported-agent claims in the same revert.

## Approval Gates

1. Requirement brief: approved.
2. Homepage hierarchy: approved.
3. Visual system: approved.
4. Technical design: approved.
5. Scope expansion for Hermes and OpenClaw support: approved.
6. Written-spec review: pending user review of this file.
7. Startup-goal role route: pending after written-spec approval.
8. Workspace-write implementation: requires explicit approval after dispatch
   preflight.
9. Release verification: QA evidence required before completion.
