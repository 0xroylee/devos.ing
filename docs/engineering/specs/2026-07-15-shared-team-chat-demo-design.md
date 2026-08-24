# Shared Team Chat Demo Design

**Status:** Approved design; awaiting written-spec review

**Date:** 2026-07-15

## Summary

Replace the landing page's control-tower node diagram with one chronological
shared team chat. The simulation still uses the three hardcoded, installable
team cases, but it should read like the user, coordinator, specialists, and
verification roles are collaborating in the same thread.

Remove the entire `How orchestration works` section from the landing page. The
chat becomes the single detailed explanation of how orchestration behaves.

This design amends the demo and information-architecture sections of
`2026-07-15-codex-orchestration-teams-landing-design.md`. The team manifests,
case data, hero position, and featured-team section remain unchanged.

## Goals

- Make orchestration feel like a real team conversation instead of a process
  diagram.
- Show explicit handoffs between the user, coordinator, specialists,
  implementation, and verification.
- Preserve the landing, stock, and market demo tabs and their real skill source
  links.
- Keep the preview deterministic, finite, replayable, and clearly hardcoded.
- Remove the separate explainer section so the page reaches the demo sooner.
- Keep the completed thread readable at 320, 768, and 1440 pixel widths.

## Non-goals

- No message composer or interactive prompt submission.
- No live agents, API calls, browsing, or current market data.
- No private conversations, channels, sidebars, or per-agent chat panels.
- No changes to team manifests, skill behavior, routing policy, or workflow
  installation.
- No redesign of the featured teams, Skill Hub, workflow routes, or common
  commands.

## Landing information architecture

The hero remains unchanged and its `Watch a team run` action continues to jump
to `#workflow-example`.

Delete the rendered `How orchestration works` section, including its
`FlowDiagram` mount. The reusable component may remain in the repository, but
it is no longer part of the landing page or public content narrative.

The orchestration demo follows the hero directly. Featured teams, Skill Hub,
install guidance, authoring guidance, and footer keep their current order.

English, Traditional Chinese, and design-document mirrors must stop describing
the removed section as visible landing content.

## Shared team chat

### Frame

Keep the existing three keyboard-accessible case tabs above one bordered chat
surface. The chat header contains:

- the selected case title and team name;
- `Example run · hardcoded preview`;
- the short case description; and
- the `Replay` control.

The surface is a preview, not a product input. It must not render a textarea,
send button, fake cursor, or affordance that implies the visitor can submit a
live request.

### Message sequence

Each case maps its existing orchestration phases into one chronological thread:

1. **User goal** — a right-aligned user message containing the coordinator
   invocation and goal.
2. **Coordinator intake** — a left-aligned coordinator message summarizing its
   clarification and approval work, with a clickable skill source.
3. **System handoff** — a compact neutral event stating that approved specialist
   roles were added to the thread.
4. **Specialist replies** — one left-aligned message per parallel specialist.
   Each message shows participant name, role, clickable skill, concise activity,
   and the completed result when available.
5. **Convergence event** — a neutral event stating that the coordinator is
   combining the specialist evidence.
6. **Verification replies** — implementation or verification roles post in
   sequence, preserving each case's existing gated order.
7. **Verified result** — one emphasized coordinator message containing the case
   outcome and completed state.

Parallel work is represented by a quick stagger of specialist replies in the
same thread. It must not return to columns or separate agent panels.

### Participant identity

Messages distinguish participants through text before color:

- participant name;
- role or stage label;
- skill identifier and source link; and
- visible queued, active, or complete status when the status is relevant.

Use small initial avatars or restrained role marks. Do not add external profile
images or imply that the participants are real people.

## Motion and state

Reuse the existing orchestration state machine and case data. The visual layer
translates each phase into visible chat messages rather than nodes and
connectors.

- Autoplay begins once when the demo reaches the viewport midpoint.
- A single active typing indicator may appear for the currently responding
  participant and is replaced by the actual message at the next phase.
- Specialist messages reveal with a short finite stagger.
- `Replay` resets the selected case to the opening user message.
- Switching cases resets that thread and starts its deterministic sequence.
- Page visibility pauses progression and resumes without skipping messages.
- Reduced motion renders the full completed conversation immediately and
  disables typing and reveal motion.
- There is no infinite animation or fake streaming text.

The existing pure state functions remain the behavioral source of truth unless
a small view-model helper materially simplifies phase-to-message mapping.

## Accessibility

- Preserve the tablist, tab, and tabpanel keyboard contract, including arrow,
  Home, and End navigation.
- Render the conversation as an ordered list or similarly structured transcript
  with individually labelled message articles.
- Keep one concise `aria-live="polite"` status line for phase changes; do not
  repeatedly announce the entire growing transcript.
- Skill source links remain keyboard reachable and use truthful `View skill`
  semantics.
- Status meaning must be available in text and not rely on color or animation.
- Focus does not move automatically as messages appear.

## Responsive behavior

- The conversation is always one column.
- User messages may align right on wider screens but retain a readable maximum
  width and never cause horizontal scrolling.
- Agent messages align left and use the available width without nested card
  grids.
- Metadata wraps below the participant name on narrow screens.
- The chat header stacks its description and Replay control at mobile widths.

## Content and data

Continue using `orchestrationCases` as the single source for the three previews.
The existing prompt, activity, result, outcome, install command, and source URL
fields are sufficient. Component-local labels may change from control-tower
language to chat language.

The public disclosure remains exactly `Example run · hardcoded preview`.
Finance and market messages describe research process and artifacts only; they
must not add current values or personalized investment advice.

## Expected implementation seams

- `landing/components/landing-page.tsx` removes the explainer section and its
  `FlowDiagram` import.
- `landing/components/workflow-run-demo.tsx` renders the shared thread while
  preserving state, replay, visibility, tabs, and source links.
- `landing/app/globals.css` replaces lane and connector motion with finite chat
  message and typing-indicator motion.
- `landing/lib/orchestration-demo.ts` changes only if a pure message-visibility
  helper improves testability.
- `landing/lib/landing-content.ts` changes only when a durable chat label belongs
  in shared content.
- `docs/landing-content.md`, `docs/landing-content.zh-Hant.md`, and
  `landing/design.md` mirror the visible change.
- `tests/landing-app.test.ts` and landing unit tests enforce the chat contract and
  removal of the explainer section.

## Verification

- Add or update a source-contract test that rejects the rendered
  `How orchestration works` section and requires the shared chat transcript.
- Preserve state-machine tests for the complete phase sequence and reduced
  motion.
- Test phase-to-message visibility if that logic is extracted.
- Run the focused landing tests, landing typecheck and production build, then the
  repository-wide `rtk bun run check` gate.
- Browser-test 320, 768, and 1440 pixel widths for readability and horizontal
  overflow.
- Browser-test autoplay, Replay, case switching, keyboard tabs, source links,
  and the completed reduced-motion representation where the browser supports
  it.

## Acceptance criteria

- The landing page does not render the `How orchestration works` section.
- Each demo case appears as one shared chronological team conversation.
- User, coordinator, specialists, system handoffs, verification, and the final
  result are visibly distinguishable.
- The transcript uses the real case skills and preserves clickable source links.
- Replay, case switching, visibility pause, keyboard tabs, and reduced motion
  retain their current behavior.
- The preview remains explicitly hardcoded and does not imply live execution.
- No new dependency, API, or runtime integration is introduced.
