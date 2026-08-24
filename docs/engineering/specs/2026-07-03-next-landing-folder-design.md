# Next Landing Folder Design

## Goal

Create an isolated `landing/` app that ports the downloaded "Create
Omniskills Workflows" Vite export into a Next.js 16 App Router application
styled with Tailwind CSS.

The app is a public product surface for Omniskills workflow bundles. It must
not change the root Bun CLI package, CLI command semantics, or workflow-bundle
runtime.

## Approved Decisions

- Package manager: Bun.
- Visual direction: keep the downloaded export's dark, technical direction.
- GitHub URL: `https://github.com/0xroylee/omniskill`.
- Implementation approach: isolated Next app port in `landing/`.

## Architecture

`landing/` is a separate Next.js application with its own `package.json`,
dependencies, lockfile, config, and checks. The root package remains the
Omniskills CLI package.

The app uses the App Router:

```text
landing/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
    flow-diagram.tsx
    terminal-block.tsx
    workflow-card.tsx
  lib/
    landing-content.ts
  ATTRIBUTIONS.md
  README.md
  package.json
  postcss.config.mjs
  tsconfig.json
```

The first route is static. It does not call the CLI source at runtime. Product
content is represented as local typed data so the visual components stay simple
and easy to test.

## Component Design

`app/page.tsx` owns the page composition:

- navigation;
- hero;
- how-it-works section;
- workflow card grid;
- install/create command section;
- footer.

`lib/landing-content.ts` exports typed arrays for:

- workflows;
- command examples;
- supported agents;
- how-it-works copy.

`components/workflow-card.tsx` renders one workflow bundle card. It receives a
plain workflow object and displays the name, description, entry skill, tag,
accent, and skill list.

`components/terminal-block.tsx` renders command examples without executing
anything. Copy behavior is out of scope for this first pass.

`components/flow-diagram.tsx` ports the static flow diagram treatment from the
export as semantic HTML and Tailwind utilities. It should avoid SVG-only
content where text needs to be searchable.

## Styling

Tailwind CSS is the primary styling surface. The app follows the current Next.js
guidance: Tailwind is imported from `app/globals.css`, and the PostCSS plugin is
configured in `postcss.config.mjs`.

Global CSS is limited to:

- Tailwind import;
- color-scheme and body defaults;
- selection color;
- small reusable CSS variables if needed.

The design keeps the export's dark product mood but avoids making the page a
single-hue purple surface. Violet can remain an accent, but workflow cards and
status signals should also use cyan, emerald, amber, and neutral contrast.

Cards, buttons, and code blocks should keep stable dimensions across desktop and
mobile. Text must wrap cleanly inside command blocks and cards.

## Content Rules

Commands must teach the root-first Omniskills CLI surface:

```bash
npx omniskill install 'https://github.com/0xroylee/omniskill.git#examples/workflows/openspec-delivery'
npx omniskill list
npx omniskill init my-workflow
npx omniskill validate my-workflow
```

The page must not advertise removed nested `omniskill` subcommands, Pony
Trail history, revert, or prehook commands.

The page should preserve the four workflow examples from the export:

- OpenSpec Delivery;
- Release Review;
- Real Engineering;
- Product Dev or Development Design Delivery, depending on the current README
  examples.

The landing folder must preserve source attribution in `ATTRIBUTIONS.md`.

## Dependencies

Use the smallest practical dependency set:

- `next`;
- `react`;
- `react-dom`;
- `lucide-react`;
- `tailwindcss`;
- `@tailwindcss/postcss`;
- `typescript`;
- `@types/react`;
- `@types/node`.

Do not port the export's broad component-library dependency list unless a
specific component actually needs it.

Before adding any dependency from the root package, use the repo's dependency
recency check if applicable. For landing-only Next/Tailwind packages, pin
stable current versions in `landing/package.json` and verify with Bun.

## Verification

The implementation plan should include a small landing check before the app
exists, then make it pass after the port. The check should assert that
`landing/app/page.tsx` or the rendered output contains the expected product
signals:

- `Omniskills`;
- `OpenSpec Delivery`;
- `Release Review`;
- `Real Engineering`;
- a root-first install command.

Final verification should run:

```bash
cd landing
bun install
bun run typecheck
bun run build
```

Then run the repo gate:

```bash
rtk bun run check
```

If dependency installation requires network access, request approval and rerun
the failed Bun command with escalation.

## Risks

The main risk is dependency sprawl from the downloaded export. The mitigation is
to port the visual structure and content, not the entire generated dependency
set.

The second risk is command drift. The mitigation is to keep commands in
`lib/landing-content.ts` and verify they match the root-first CLI story already
documented in the README.

The third risk is layout polish on mobile. The implementation should include a
local smoke check for text wrapping in the hero command, workflow cards, and
command examples before completion.

## Self-Review

- Placeholder scan: no placeholder markers or unspecified implementation
  sections remain.
- Consistency check: the design matches the approved isolated Next app port,
  Bun package manager, dark visual direction, and Omniskills GitHub URL.
- Scope check: this is a single static landing app, not a deployment, analytics,
  backend, or CLI change.
- Ambiguity check: dependency scope, file boundaries, command content, and
  verification commands are explicit.
