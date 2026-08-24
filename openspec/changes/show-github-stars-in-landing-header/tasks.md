# Tasks

## 1. Proposal Approval

- [x] Create OpenSpec proposal, spec delta, and task checklist.
- [x] Review `proposal.md` scope with the human owner.
- [x] Decide fallback text when GitHub metadata is unavailable (`Stars`).
- [x] Decide compact star-count format (`1.2k stars`).

## 2. Brainstorm Design

- [x] Explore 2-3 header star-display approaches with trade-offs.
- [x] Confirm the recommended design with the human owner.
- [x] Save the approved design to `docs/engineering/specs/`.
- [x] Re-review the written design for unfinished markers, contradictions, and
      scope creep.

## 3. Plan Implementation

- [x] Write the implementation plan in `docs/engineering/plans/`.
- [x] Include TDD slices for GitHub metadata formatting, page-to-client prop
      wiring, header rendering, fallback behavior, and verification commands.

## 4. Implement With TDD

- [x] Add a failing landing source-contract test for the server-side GitHub star
      metadata path.
- [x] Add a failing landing source-contract test for header fallback rendering.
- [x] Implement the GitHub repository metadata fetch in `landing/app/page.tsx`.
- [x] Pass a `githubStarsLabel` prop into `LandingPage`.
- [x] Update the header GitHub link to render the star label compactly.
- [x] Run focused landing tests.

## 5. Verify And Archive

- [x] Run landing app typecheck and build checks.
- [x] Run `rtk bun run check`.
- [x] Smoke the landing header on desktop and mobile viewports.
- [x] Record Pony Trail post-change evidence.
- [ ] Run `/opsx:archive` after human approval.
