# Startup Team Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use mattpocock:subagent-driven-development (recommended) or mattpocock:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved audience-first Startup Team homepage with supported-agent logos, audience-specific outcomes, a deterministic flagship showcase, six illustrated capabilities, preserved catalog discovery, and verified responsive accessibility.

**Architecture:** Keep `landing/lib/landing-content.ts` as the typed content source and `landing-page.tsx` as a thin composer. Add small client components only where interaction is required, keep illustration selection behind a closed union, reuse the existing clipboard and orchestration helpers, and preserve Featured Team plus Skill Hub as later-page boundaries.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, inline SVG, Bun test, Biome, browser smoke testing.

---

## Prerequisite

Complete and verify
`docs/engineering/plans/2026-07-16-hermes-openclaw-skill-targets.md` first. The
homepage must not call Hermes or OpenClaw supported until those targets pass the
runtime and CLI tests.

## File Map

| File | Responsibility |
| --- | --- |
| `landing/lib/landing-content.ts` | Typed audiences, agents, capabilities, steps, FAQ, and CTA copy. |
| `landing/lib/audience-tabs.ts` | Pure keyboard-index transition helper. |
| `landing/tests/audience-tabs.test.ts` | Arrow/Home/End transition coverage. |
| `landing/components/startup-team-hero.tsx` | Hero, install command, GitHub action, and supported-agent strip composition. |
| `landing/components/supported-agent-strip.tsx` | Logo tiles and accessible text fallback. |
| `landing/components/audience-showcase.tsx` | ARIA tabs, selected story, and outcome illustration. |
| `landing/components/capability-illustrations.tsx` | Closed illustration union and six inline SVGs. |
| `landing/components/capability-grid.tsx` | Capability card layout and illustration pairing. |
| `landing/components/how-startup-team-works.tsx` | Three-step install/invoke/approve story. |
| `landing/components/landing-faq.tsx` | Accessible FAQ disclosure state. |
| `landing/components/final-install-cta.tsx` | Repeated whole-target install command and source action. |
| `landing/components/landing-page.tsx` | Homepage section order and existing catalog/search state. |
| `landing/components/workflow-run-demo.tsx` | Approved default scenario labels and visual restyle only. |
| `landing/app/globals.css` | Editorial tokens, section styling hooks, motion, breakpoints, and reduced motion. |
| `landing/app/metadata.ts` | Startup Team-first title and description. |
| `landing/public/agent-logos/*` | Local supported-agent visual assets. |
| `landing/ATTRIBUTIONS.md` | Official brand-asset sources and license notes. |
| `landing/design.md` | Active homepage design contract. |
| `tests/landing-app.test.ts` | Public source contract and prohibited-claim assertions. |
| `tests/landing-skill-hub.test.ts` | Existing catalog parity and order protection. |

### Task 1: Define The New Content Contract

**Files:**
- Modify: `tests/landing-app.test.ts`
- Modify: `landing/lib/landing-content.ts`

- [ ] **Step 1: Add a failing source-contract test**

Add:

```ts
test("defines the audience-first Startup Team landing contract", () => {
  const page = readLandingFile("components/landing-page.tsx");
  const content = readLandingFile("lib/landing-content.ts");

  for (const label of ["Solo Founders", "Developers", "Startup Teams"]) {
    expect(content).toContain(`label: "${label}"`);
  }
  for (const agent of [
    "Cursor",
    "Codex",
    "Claude",
    "OpenCode",
    "Hermes",
    "OpenClaw",
    "GitHub Copilot",
  ]) {
    expect(content).toContain(`name: "${agent}"`);
  }
  for (const capability of [
    "Strategy & validation",
    "Product requirements",
    "Interface design",
    "Architecture & implementation",
    "QA & release verification",
    "Approval gates & handoffs",
  ]) {
    expect(content).toContain(`title: "${capability}"`);
  }
  expect(content).toContain('headline: "From rough idea to verified release."');
  expect(content).toContain('label: "Simulated run"');
  expect(page).toContain("<FeaturedTeamSection");
  expect(page).toContain("<SkillHub");
  expect(page).not.toContain("install count");
  expect(page).not.toContain("active users");
});
```

- [ ] **Step 2: Replace the old supported-agent test**

Require these exact local assets:

```ts
const logoAgents = [
  ["cursor", "agent-logos/cursor.svg"],
  ["codex", "agent-logos/openai.svg"],
  ["claude", "agent-logos/claude.svg"],
  ["opencode", "agent-logos/opencode.png"],
  ["hermes", "agent-logos/hermes.png"],
  ["openclaw", "agent-logos/openclaw.png"],
  ["github-copilot", "agent-logos/github-copilot.svg"],
] as const;
```

Keep the existing `existsSync` loop. Replace the old Codex-first hero copy
assertions with `Supported Agents` and the exact compatibility sentence:

```text
Skills install across these agents. Verified dispatch receipts currently require Codex CLI.
```

- [ ] **Step 3: Run the focused source-contract test**

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: FAIL because the new content exports and assets do not exist.

- [ ] **Step 4: Add the content types**

Insert after `AgentBadgeContent`:

```ts
export type AudienceId = "solo-founders" | "developers" | "startup-teams";

export interface AudienceStoryContent {
  id: AudienceId;
  label: string;
  promise: string;
  outcomes: readonly [string, string, string];
}

export type CapabilityId =
  | "strategy"
  | "requirements"
  | "interface"
  | "architecture"
  | "verification"
  | "handoffs";

export interface CapabilityContent {
  id: CapabilityId;
  title: string;
  description: string;
}

export interface FaqContent {
  question: string;
  answer: string;
}

export interface StartupStepContent {
  title: string;
  body: string;
}
```

Extend `AgentId` to:

```ts
export type AgentId =
  | "cursor"
  | "codex"
  | "claude"
  | "opencode"
  | "hermes"
  | "openclaw"
  | "github-copilot";
```

- [ ] **Step 5: Add exact visible content exports**

Add:

```ts
export const startupLandingContent = {
  eyebrow: "Your startup’s agent team",
  headline: "From rough idea to verified release.",
  lead: "A coordinated skill set for solo founders, developers, and startup teams—from strategy and product thinking through implementation and QA.",
  installCommand: "npx omniskill@latest install startup-team",
  githubLabel: "View on GitHub",
  supportedAgentsLabel: "Supported Agents",
  compatibility:
    "Skills install across these agents. Verified dispatch receipts currently require Codex CLI.",
  showcase: {
    eyebrow: "Flagship showcase",
    heading: "One goal. The right specialists. Visible handoffs.",
    label: "Simulated run",
  },
} as const;

export type StartupLandingContent = typeof startupLandingContent;

export const audienceStories: readonly AudienceStoryContent[] = [
  {
    id: "solo-founders",
    label: "Solo Founders",
    promise: "Move from idea to shipped product without pretending every specialist is in-house.",
    outcomes: [
      "Pressure-test a product idea",
      "Turn decisions into an approval-ready build brief",
      "Ship with interface and QA checks",
    ],
  },
  {
    id: "developers",
    label: "Developers",
    promise: "Start implementation with clearer decisions and finish with stronger evidence.",
    outcomes: [
      "Convert a rough request into acceptance criteria",
      "Surface architecture and interface risks before editing",
      "Implement the approved slice and verify regressions",
    ],
  },
  {
    id: "startup-teams",
    label: "Startup Teams",
    promise: "Keep product, design, engineering, and QA aligned through visible handoffs.",
    outcomes: [
      "Establish one shared requirement brief",
      "Route only the specialists the work needs",
      "Record decisions, approvals, risks, and verification evidence",
    ],
  },
];

export const capabilities: readonly CapabilityContent[] = [
  {
    id: "strategy",
    title: "Strategy & validation",
    description: "Challenge assumptions and make a defensible direction decision.",
  },
  {
    id: "requirements",
    title: "Product requirements",
    description: "Produce clear scope, acceptance criteria, and approval-ready requirements.",
  },
  {
    id: "interface",
    title: "Interface design",
    description: "Shape responsive hierarchy, interaction, accessibility, and motion.",
  },
  {
    id: "architecture",
    title: "Architecture & implementation",
    description: "Expose technical risk and execute the approved build slice.",
  },
  {
    id: "verification",
    title: "QA & release verification",
    description: "Check acceptance, regressions, responsiveness, and release behavior.",
  },
  {
    id: "handoffs",
    title: "Approval gates & handoffs",
    description: "Keep decisions and accountable roles visible throughout the run.",
  },
];

export const startupSteps: readonly StartupStepContent[] = [
  {
    title: "Install the team",
    body: "Copy one command into a supported agent environment.",
  },
  {
    title: "Call $startup-goal",
    body: "Describe the outcome; the coordinator clarifies until the brief is ready.",
  },
  {
    title: "Approve and ship",
    body: "Approve the brief and route, then receive verified work and a decision log.",
  },
];

export const faqItems: readonly FaqContent[] = [
  {
    question: "Does Startup Team replace my judgment?",
    answer: "No. You approve the requirement brief, role route, permission changes, and any lower-tier fallback before work continues.",
  },
  {
    question: "Which agents are supported, and which features differ by agent?",
    answer: "Skills install into Cursor, Codex, Claude, OpenCode, Hermes, OpenClaw, and GitHub Copilot. Verified dispatch receipts currently require Codex CLI.",
  },
  {
    question: "Can I inspect every included skill?",
    answer: "Yes. Startup Team exposes its coordinator, member roles, workflow source, and local skill sources for inspection.",
  },
  {
    question: "Does every goal run every specialist role?",
    answer: "No. The coordinator selects the smallest safe role set and explains which roles were skipped and what would bring them back.",
  },
];
```

- [ ] **Step 6: Expand the agent data**

Use this order and paths:

```ts
export const agents: AgentBadgeContent[] = [
  { id: "cursor", name: "Cursor", logoSrc: "/agent-logos/cursor.svg" },
  { id: "codex", name: "Codex", logoSrc: "/agent-logos/openai.svg" },
  { id: "claude", name: "Claude", logoSrc: "/agent-logos/claude.svg" },
  { id: "opencode", name: "OpenCode", logoSrc: "/agent-logos/opencode.png" },
  { id: "hermes", name: "Hermes", logoSrc: "/agent-logos/hermes.png" },
  { id: "openclaw", name: "OpenClaw", logoSrc: "/agent-logos/openclaw.png" },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    logoSrc: "/agent-logos/github-copilot.svg",
  },
];
```

- [ ] **Step 7: Run the source-contract test**

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: asset assertions still FAIL; content assertions PASS.

- [ ] **Step 8: Commit the content contract**

```bash
rtk git add tests/landing-app.test.ts landing/lib/landing-content.ts
rtk git commit -m "feat: define startup team landing story"
```

### Task 2: Add Verified Agent Assets And The Logo Strip

**Files:**
- Create: `landing/public/agent-logos/opencode.png`
- Create: `landing/public/agent-logos/hermes.png`
- Create: `landing/public/agent-logos/openclaw.png`
- Create: `landing/components/supported-agent-strip.tsx`
- Modify: `landing/ATTRIBUTIONS.md`
- Test: `tests/landing-app.test.ts`

- [ ] **Step 1: Source the three missing assets from official GitHub organizations**

Use these exact official sources and save 128px square PNGs through the approved
asset-download mechanism:

```text
https://github.com/anomalyco.png?size=128
https://github.com/NousResearch.png?size=128
https://github.com/openclaw.png?size=128
```

Save them as `opencode.png`, `hermes.png`, and `openclaw.png`. Inspect all three
before use. If an organization avatar is not product-identifiable, stop this
task and use the spec’s neutral text-tile fallback; do not invent or redraw a
brand logo.

- [ ] **Step 2: Record attribution**

Append this table to `landing/ATTRIBUTIONS.md`:

```markdown
## Supported agent marks

| Asset | Source | Use |
| --- | --- | --- |
| OpenCode | https://github.com/anomalyco | Supported-agent identification |
| Hermes | https://github.com/NousResearch/hermes-agent | Supported-agent identification |
| OpenClaw | https://github.com/openclaw/openclaw | Supported-agent identification |
```

- [ ] **Step 3: Implement the presentation component**

```tsx
import Image from "next/image";
import type { AgentBadgeContent } from "../lib/landing-content";

export function SupportedAgentStrip({
  agents,
  label,
  compatibility,
}: {
  agents: readonly AgentBadgeContent[];
  label: string;
  compatibility: string;
}) {
  return (
    <section aria-labelledby="supported-agents-heading" className="agent-strip">
      <p id="supported-agents-heading" className="section-label text-center">
        {label}
      </p>
      <ul className="agent-logo-grid" aria-label={label}>
        {agents.map((agent) => (
          <li key={agent.id} className="agent-logo-tile">
            {agent.logoSrc ? (
              <Image src={agent.logoSrc} alt="" width={24} height={24} aria-hidden="true" />
            ) : null}
            <span>{agent.name}</span>
          </li>
        ))}
      </ul>
      <p className="agent-compatibility">{compatibility}</p>
    </section>
  );
}
```

The text name is always present, so a failed image never removes agent identity.

- [ ] **Step 4: Run the focused test**

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: logo existence assertions PASS.

- [ ] **Step 5: Commit assets and strip**

```bash
rtk git add landing/public/agent-logos landing/components/supported-agent-strip.tsx landing/ATTRIBUTIONS.md
rtk git commit -m "feat: add supported agent logo strip"
```

### Task 3: Build Keyboard-Correct Audience Tabs

**Files:**
- Create: `landing/lib/audience-tabs.ts`
- Create: `landing/tests/audience-tabs.test.ts`
- Create: `landing/components/audience-showcase.tsx`

- [ ] **Step 1: Write failing pure-navigation tests**

```ts
import { describe, expect, test } from "bun:test";
import { nextAudienceIndex } from "../lib/audience-tabs";

describe("nextAudienceIndex", () => {
  test("wraps ArrowRight and ArrowLeft", () => {
    expect(nextAudienceIndex(2, "ArrowRight", 3)).toBe(0);
    expect(nextAudienceIndex(0, "ArrowLeft", 3)).toBe(2);
  });

  test("supports Home and End", () => {
    expect(nextAudienceIndex(1, "Home", 3)).toBe(0);
    expect(nextAudienceIndex(1, "End", 3)).toBe(2);
  });

  test("ignores unrelated keys", () => {
    expect(nextAudienceIndex(1, "Enter", 3)).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

```bash
rtk bun test landing/tests/audience-tabs.test.ts
```

Expected: FAIL because `audience-tabs.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

```ts
export function nextAudienceIndex(current: number, key: string, count: number): number {
  if (count <= 0) return 0;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight") return (current + 1) % count;
  if (key === "ArrowLeft") return (current - 1 + count) % count;
  return current;
}
```

- [ ] **Step 4: Implement the ARIA tab component**

Use this complete interaction shape:

```tsx
"use client";

import { useRef, useState } from "react";
import type { AudienceStoryContent } from "../lib/landing-content";
import { nextAudienceIndex } from "../lib/audience-tabs";

export function AudienceShowcase({
  stories,
}: {
  stories: readonly AudienceStoryContent[];
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <section id="audiences" className="landing-section" aria-labelledby="audience-heading">
      <p className="section-label">Who it’s for</p>
      <h2 id="audience-heading" className="editorial-heading">
        See what your team can achieve.
      </h2>
      <div role="tablist" aria-label="Startup Team audiences" className="audience-tabs">
        {stories.map((story, index) => (
          <button
            key={story.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            id={`audience-tab-${story.id}`}
            type="button"
            role="tab"
            aria-selected={selectedIndex === index}
            aria-controls={`audience-panel-${story.id}`}
            tabIndex={selectedIndex === index ? 0 : -1}
            onClick={() => setSelectedIndex(index)}
            onKeyDown={(event) => {
              const nextIndex = nextAudienceIndex(index, event.key, stories.length);
              if (nextIndex === index && !["Home", "End"].includes(event.key)) return;
              event.preventDefault();
              setSelectedIndex(nextIndex);
              tabRefs.current[nextIndex]?.focus();
            }}
          >
            {story.label}
          </button>
        ))}
      </div>
      {stories.map((story, index) => (
        <div
          key={story.id}
          id={`audience-panel-${story.id}`}
          role="tabpanel"
          aria-labelledby={`audience-tab-${story.id}`}
          hidden={selectedIndex !== index}
          className="audience-stage"
        >
          <div>
            <h3>{story.promise}</h3>
            <ul>
              {story.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
            </ul>
          </div>
          <div className="audience-outcome-art" aria-hidden="true">
            <span>Rough goal</span><span>Approved plan</span><span>Verified result</span>
          </div>
        </div>
      ))}
    </section>
  );
}
```

Keep all three tabpanels in the DOM and mark inactive panels `hidden`; do not
destroy their content on selection.

- [ ] **Step 5: Run local and root tests**

```bash
rtk bun test landing/tests/audience-tabs.test.ts tests/landing-app.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the audience interaction**

```bash
rtk git add landing/lib/audience-tabs.ts landing/tests/audience-tabs.test.ts landing/components/audience-showcase.tsx
rtk git commit -m "feat: add startup audience showcase"
```

### Task 4: Build The Six Capability Illustrations

**Files:**
- Create: `landing/components/capability-illustrations.tsx`
- Create: `landing/components/capability-grid.tsx`
- Modify: `tests/landing-app.test.ts`

- [ ] **Step 1: Add a failing closed-union contract test**

Require the illustration module to contain every id and accessibility contract:

```ts
const illustrations = readLandingFile("components/capability-illustrations.tsx");
for (const id of ["strategy", "requirements", "interface", "architecture", "verification", "handoffs"]) {
  expect(illustrations).toContain(`case "${id}"`);
}
expect(illustrations).toContain('aria-hidden="true"');
expect(illustrations).toContain("motion-capability");
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: FAIL because both capability components are missing.

- [ ] **Step 3: Implement the closed illustration renderer**

Use this exhaustive renderer. The six groups are intentionally simple,
themeable diagrams; visual polish belongs in scoped CSS rather than opaque path
data.

```tsx
import type { CapabilityId } from "../lib/landing-content";

function IllustrationMarks({ id }: { id: CapabilityId }) {
  switch (id) {
    case "strategy":
      return <><circle cx="80" cy="60" r="36" /><circle className="motion-capability" cx="40" cy="60" r="11" /><circle cx="116" cy="38" r="11" /><circle cx="111" cy="91" r="11" /></>;
    case "requirements":
      return <><rect x="38" y="25" width="70" height="22" rx="6" /><rect className="motion-capability" x="48" y="51" width="70" height="22" rx="6" /><rect x="58" y="77" width="70" height="22" rx="6" /></>;
    case "interface":
      return <><rect x="28" y="22" width="104" height="76" rx="10" /><path d="M28 44h104M48 59h35M48 72h55" /><circle className="motion-capability" cx="110" cy="76" r="12" /></>;
    case "architecture":
      return <><path d="M44 60 78 32l38 28-38 30Z" /><rect x="27" y="48" width="28" height="24" rx="7" /><rect className="motion-capability" x="65" y="18" width="28" height="24" rx="7" /><rect x="105" y="48" width="28" height="24" rx="7" /><rect x="65" y="80" width="28" height="24" rx="7" /></>;
    case "verification":
      return <><path d="M80 18 119 34l-8 48-31 24-31-24-8-48Z" /><path className="motion-capability" d="m61 61 13 13 26-29" /></>;
    case "handoffs":
      return <><path d="M45 60h70M101 47l14 13-14 13" /><circle cx="34" cy="60" r="14" /><circle className="motion-capability" cx="126" cy="60" r="14" /></>;
  }
}

export function CapabilityIllustration({ id }: { id: CapabilityId }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 160 120" className="capability-art">
      <IllustrationMarks id={id} />
    </svg>
  );
}
```

Each private illustration returns
`<svg aria-hidden="true" focusable="false" viewBox="0 0 160 120">` with a
shared `motion-capability` class on exactly one moving group. Use only
`currentColor`, `var(--capability-accent)`, and neutral CSS variables; do not
hardcode six unrelated palettes inside SVG markup.

- [ ] **Step 4: Implement the grid**

```tsx
import type { CapabilityContent } from "../lib/landing-content";
import { CapabilityIllustration } from "./capability-illustrations";

export function CapabilityGrid({ items }: { items: readonly CapabilityContent[] }) {
  return (
    <section id="capabilities" aria-labelledby="capabilities-heading" className="landing-section">
      <p className="section-label">Capabilities</p>
      <h2 id="capabilities-heading" className="editorial-heading">
        Everything needed to move product work forward.
      </h2>
      <div className="capability-grid">
        {items.map((item) => (
          <article key={item.id} className={`capability-card capability-${item.id}`}>
            <CapabilityIllustration id={item.id} />
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run focused tests**

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit capabilities**

```bash
rtk git add tests/landing-app.test.ts landing/components/capability-illustrations.tsx landing/components/capability-grid.tsx
rtk git commit -m "feat: illustrate startup team capabilities"
```

### Task 5: Compose Hero, Usage Steps, FAQ, And Final CTA

**Files:**
- Create: `landing/components/startup-team-hero.tsx`
- Create: `landing/components/how-startup-team-works.tsx`
- Create: `landing/components/landing-faq.tsx`
- Create: `landing/components/final-install-cta.tsx`
- Modify: `tests/landing-app.test.ts`

- [ ] **Step 1: Add failing component-boundary assertions**

```ts
for (const file of [
  "components/startup-team-hero.tsx",
  "components/how-startup-team-works.tsx",
  "components/landing-faq.tsx",
  "components/final-install-cta.tsx",
]) {
  expect(existsSync(join(landingRoot, file))).toBe(true);
}
```

Require the FAQ source to contain `aria-expanded`, `aria-controls`, and all four
questions from the spec. Require both hero and final CTA to receive the same
install command prop and render `TerminalBlock` with `copyText`.

- [ ] **Step 2: Run the focused test and verify missing-file failures**

```bash
rtk bun test tests/landing-app.test.ts
```

- [ ] **Step 3: Implement `StartupTeamHero`**

Use a server-safe presentation component with this public API and DOM order:

```tsx
import { Github } from "lucide-react";
import type { AgentBadgeContent, StartupLandingContent } from "../lib/landing-content";
import { SupportedAgentStrip } from "./supported-agent-strip";
import { TerminalBlock } from "./terminal-block";

export function StartupTeamHero({
  content,
  agents,
  githubStarsLabel,
  githubUrl,
}: {
  content: StartupLandingContent;
  agents: readonly AgentBadgeContent[];
  githubStarsLabel: string;
  githubUrl: string;
}) {
  return (
    <>
      <section id="top" className="startup-hero">
        <p className="section-label">{content.eyebrow}</p>
        <h1>{content.headline}</h1>
        <p>{content.lead}</p>
        <div className="hero-actions">
          <TerminalBlock compact copyText={content.installCommand} copyLabel="Copy Startup Team install command" lines={[{ prefix: "$", text: content.installCommand }]} />
          <a href={githubUrl} className="secondary-action" aria-label={`View on GitHub, ${githubStarsLabel}`}>
            <Github size={16} /> {content.githubLabel}
          </a>
        </div>
      </section>
      <SupportedAgentStrip agents={agents} label={content.supportedAgentsLabel} compatibility={content.compatibility} />
    </>
  );
}
```

- [ ] **Step 4: Implement the three-step section**

```tsx
import type { StartupStepContent } from "../lib/landing-content";

export function HowStartupTeamWorks({ steps }: { steps: readonly StartupStepContent[] }) {
  return (
    <section id="how-it-works" className="landing-section" aria-labelledby="startup-steps-heading">
      <p className="section-label">How it works</p>
      <h2 id="startup-steps-heading" className="editorial-heading">Install once. Invoke one goal. Stay in control.</h2>
      <ol className="startup-steps">
        {steps.map((step, index) => <li key={step.title}><span>0{index + 1}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}
      </ol>
    </section>
  );
}
```

- [ ] **Step 5: Implement the accessible FAQ**

Use a client component with `Set<number>` state. Each answer remains in markup:

```tsx
"use client";
import { useState } from "react";
import type { FaqContent } from "../lib/landing-content";

export function LandingFaq({ items }: { items: readonly FaqContent[] }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  return <section className="landing-section" aria-labelledby="faq-heading"><p className="section-label">FAQ</p><h2 id="faq-heading" className="editorial-heading">Clear answers before install.</h2><div className="faq-list">{items.map((item, index) => { const expanded = open.has(index); const answerId = `faq-answer-${index}`; return <div key={item.question} className="faq-item"><button type="button" aria-expanded={expanded} aria-controls={answerId} onClick={() => setOpen((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })}>{item.question}<span aria-hidden="true">{expanded ? "−" : "+"}</span></button><div id={answerId} hidden={!expanded}><p>{item.answer}</p></div></div>; })}</div></section>;
}
```

- [ ] **Step 6: Implement the final CTA**

```tsx
import { TerminalBlock } from "./terminal-block";
export function FinalInstallCta({ command, sourceUrl }: { command: string; sourceUrl: string }) {
  return <section className="final-install-cta" aria-labelledby="final-cta-heading"><h2 id="final-cta-heading">Give your next goal a real startup team.</h2><div className="hero-actions"><TerminalBlock compact copyText={command} copyLabel="Copy Startup Team install command" lines={[{ prefix: "$", text: command }]} /><a href={sourceUrl}>View source</a></div></section>;
}
```

- [ ] **Step 7: Run the focused test**

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the page sections**

```bash
rtk git add tests/landing-app.test.ts landing/components/startup-team-hero.tsx landing/components/how-startup-team-works.tsx landing/components/landing-faq.tsx landing/components/final-install-cta.tsx
rtk git commit -m "feat: add startup team landing sections"
```

### Task 6: Recompose The Homepage And Restyle The Showcase

**Files:**
- Modify: `landing/components/landing-page.tsx`
- Modify: `landing/components/workflow-run-demo.tsx`
- Modify: `landing/lib/orchestration-demo.ts`
- Modify: `tests/landing-app.test.ts`
- Test: `landing/tests/orchestration-demo.test.ts`

- [ ] **Step 1: Update the composition-order test**

Assert the component order by source index:

```ts
const heroIndex = page.indexOf("<StartupTeamHero");
const audienceIndex = page.indexOf("<AudienceShowcase");
const demoIndex = page.indexOf("<WorkflowRunDemo");
const capabilityIndex = page.indexOf("<CapabilityGrid");
const stepsIndex = page.indexOf("<HowStartupTeamWorks");
const teamIndex = page.indexOf("<FeaturedTeamSection");
const hubIndex = page.indexOf("<SkillHub");
const faqIndex = page.indexOf("<LandingFaq");
const finalIndex = page.indexOf("<FinalInstallCta");

const indexes = [
  heroIndex,
  audienceIndex,
  demoIndex,
  capabilityIndex,
  stepsIndex,
  teamIndex,
  hubIndex,
  faqIndex,
  finalIndex,
];
expect(indexes.every((value, index) => index === 0 || indexes[index - 1]! < value)).toBe(true);
expect(indexes.every((value) => value >= 0)).toBe(true);
```

- [ ] **Step 2: Update the default orchestration case**

In `landing/lib/orchestration-demo.ts`, make the Startup Team case first and use:

```ts
prompt: "Build an onboarding flow that gets a new user to first value in under two minutes.",
outcome: "Implemented onboarding flow with responsive, keyboard, reduced-motion, and QA evidence.",
previewLabel: "Example run · hardcoded preview",
```

Preserve the pure phase-transition helpers and existing tests for parallel and
gated lanes.

- [ ] **Step 3: Recompose `LandingPage`**

Keep only Skill Hub query/tab state and common-command state in `LandingPage`.
Render, in order:

```tsx
<StartupTeamHero content={startupLandingContent} agents={agents} githubStarsLabel={githubStarsLabel} githubUrl={githubUrl} />
<AudienceShowcase stories={audienceStories} />
<section id="showcase" className="landing-section" aria-labelledby="showcase-heading">
  <p className="section-label">{startupLandingContent.showcase.eyebrow}</p>
  <h2 id="showcase-heading" className="editorial-heading">
    {startupLandingContent.showcase.heading}
  </h2>
  <p className="showcase-label">{startupLandingContent.showcase.label}</p>
  <WorkflowRunDemo />
</section>
<CapabilityGrid items={capabilities} />
<HowStartupTeamWorks steps={startupSteps} />
<FeaturedTeamSection teams={teams} />
<SkillHub
  activeTab={activeHubTab}
  query={query}
  workflows={filteredWorkflows}
  skills={filteredSkills}
  onTabChange={setActiveHubTab}
  onQueryChange={setQuery}
/>
<LandingFaq items={faqItems} />
<FinalInstallCta command={startupLandingContent.installCommand} sourceUrl={startupTeam.sourceUrl} />
```

Keep the existing common-command and authoring sections after Skill Hub and
before FAQ only if they remain concise at 320px. Do not remove public CLI
authoring paths without a separate user-approved scope change.

- [ ] **Step 4: Restyle, do not rewrite, `WorkflowRunDemo`**

Preserve:

- ArrowLeft/Right/Home/End case navigation;
- Intersection Observer activation;
- document visibility pause;
- Replay;
- reduced-motion completion;
- `aria-live="polite"`;
- clickable skill-source affordances.

Change visible labels to `Simulated run`, approved audience-first headings, and
the new visual classes. Do not add elapsed time, tokens, rank, or success-rate
data.

- [ ] **Step 5: Run orchestration and landing tests**

```bash
rtk bun test landing/tests/orchestration-demo.test.ts tests/landing-app.test.ts tests/landing-skill-hub.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit composition**

```bash
rtk git add landing/components/landing-page.tsx landing/components/workflow-run-demo.tsx landing/lib/orchestration-demo.ts tests/landing-app.test.ts landing/tests/orchestration-demo.test.ts
rtk git commit -m "feat: compose audience-first startup landing"
```

### Task 7: Apply The Approved Visual And Motion System

**Files:**
- Modify: `landing/app/globals.css`
- Modify: `landing/app/metadata.ts`
- Modify: `landing/design.md`
- Modify: `tests/landing-app.test.ts`

- [ ] **Step 1: Add visual-contract assertions**

Require `globals.css` to define:

```text
--paper
--ink
--planning-soft
--implementation-soft
--verification-soft
--active-signal
.editorial-heading
.agent-logo-grid
.audience-stage
.capability-grid
.motion-capability
```

Require the reduced-motion block to reference `.motion-capability`,
`.motion-workbench`, and audience transitions. Reject `transition: all`,
`animation-iteration-count: infinite`, and horizontal page overflow.

- [ ] **Step 2: Run the test and observe missing-token failures**

```bash
rtk bun test tests/landing-app.test.ts
```

- [ ] **Step 3: Implement the tokens and layouts**

Define the base tokens in `:root`:

```css
--paper: #f8f5ed;
--paper-raised: #fffdf8;
--ink: #181715;
--body: #5f5a52;
--muted: #766f65;
--rule: #d8d2c6;
--planning-soft: #eee6ff;
--implementation-soft: #f4dfbc;
--verification-soft: #e3f2e8;
--active-signal: #d8ff9b;
```

Use CSS grid breakpoints matching the spec: one column by default, capability
two-column at 768px, three-column at 1024px. Use bounded `max-width`, wrapping
logo tiles, `overflow-wrap:anywhere` on commands, and no horizontal scrollers.

- [ ] **Step 4: Implement motion and reduced motion**

Animate only opacity and transform. Capability illustrations move once through
an observer-backed class or settle immediately without Intersection Observer.
Under `prefers-reduced-motion: reduce`, set animation duration to near-zero,
remove transform, disable smooth scroll, and show the workbench complete.

- [ ] **Step 5: Update metadata**

Use:

```ts
const title = "Startup Team for AI Agents | Omniskills";
const description =
  "Install a coordinated startup skill set for strategy, product, design, engineering, and QA in Codex, Claude, Cursor, OpenCode, Hermes, OpenClaw, and GitHub Copilot.";
```

- [ ] **Step 6: Replace the active homepage clauses in `landing/design.md`**

Document the approved audience-first order, visual tokens, six illustrations,
supported-agent distinction, and preserved secondary catalog. Retain detail-page
contracts that were outside scope.

- [ ] **Step 7: Run source and package-local tests**

```bash
rtk bun test tests/landing-app.test.ts tests/landing-skill-hub.test.ts
```

```bash
cd landing
rtk bun run test
rtk bun run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit the visual system**

```bash
rtk git add landing/app/globals.css landing/app/metadata.ts landing/design.md tests/landing-app.test.ts
rtk git commit -m "feat: apply startup landing visual system"
```

### Task 8: Verify Responsive Behavior And Release Readiness

**Files:**
- Modify only if verification exposes a defect in an already-listed landing file.

- [ ] **Step 1: Run the focused landing gate**

```bash
rtk bun test tests/landing-app.test.ts tests/landing-skill-hub.test.ts
```

```bash
cd landing
rtk bun run check
```

Expected: PASS.

- [ ] **Step 2: Start the local landing app**

```bash
cd landing
rtk bun run dev
```

Keep the server in a managed foreground session and verify that it listens
before browser checks.

- [ ] **Step 3: Smoke 320px**

Verify:

- no horizontal overflow;
- navigation retains an install path;
- hero actions stack;
- logos wrap and keep names visible;
- tabs remain operable;
- workbench and all capabilities use one column;
- Team/Skill Hub and FAQ remain reachable.

- [ ] **Step 4: Smoke 768px**

Verify two-column audience/capability layouts, readable workbench rail and
transcript, keyboard tabs, copy feedback, FAQ controls, and detail-route links.

- [ ] **Step 5: Smoke 1440px**

Verify bounded line lengths, three-column capability layout, complete
navigation, logo alignment, and the full intended section rhythm.

- [ ] **Step 6: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce`. Confirm illustrations and workbench
show complete static states, no timers create visible progress, Replay remains
understandable, and all content is present.

- [ ] **Step 7: Verify fallback states**

Use the existing test seams or browser stubs to confirm:

- clipboard failure exposes `Select and copy command`;
- missing logo image retains the agent name;
- unavailable Intersection Observer shows complete content;
- GitHub star fetch failure keeps the stable fallback label.

- [ ] **Step 8: Run the full repository gate**

```bash
rtk bun run check
```

Expected: PASS with at least 90% line coverage.

- [ ] **Step 9: Route verification defects back to their owning task**

If a defect is found, return to the task that owns the affected file, create a
new scoped Ponytrail snapshot, apply the smallest fix, repeat that task's exact
test command, and use that task's explicit file list for the fix commit. If no
defects are found, do not create an empty commit.

## Completion Evidence

The final handoff must include:

- focused runtime and landing test results;
- landing package test/typecheck/build results;
- browser evidence at 320px, 768px, and 1440px;
- keyboard, clipboard, reduced-motion, logo-fallback, and route checks;
- full `rtk bun run check` result;
- accountable files and commits per task;
- an explicit statement that all seven logos represent tested skill-install
  targets while verified dispatch receipts remain Codex CLI-only.
