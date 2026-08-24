# Codex Orchestration Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use mattpocock:subagent-driven-development (recommended) or mattpocock:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the landing around Orchestration for Codex and replace the startup transcript with one accessible control-tower demo backed by Startup, Finance, and Market teams.

**Architecture:** Keep durable copy and hardcoded cases in `landing-content.ts`, extract pure phase transitions into a testable `orchestration-demo.ts`, and leave `workflow-run-demo.tsx` responsible for rendering and browser lifecycle. Expand the existing featured-team composition without changing Skill Hub interaction semantics, and route all copy actions through one truthful clipboard helper.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Bun test, browser smoke, Biome, Ponytrail snapshots

---

## Dependency and execution rules

- Execute this plan after `2026-07-15-finance-market-teams.md` passes; the landing reads real manifests and source paths created there.
- Run every command through `rtk`.
- Preserve and build on current uncommitted landing-content and model-routing work; never reset it.
- Use test-first changes and a Ponytrail pre/post snapshot for each mutation group.
- Keep examples deterministic and label them `Example run · hardcoded preview`.
- Do not add live agents, live market data, an API, a new dependency, or continuous looping motion.

## File map

| File | Responsibility |
| --- | --- |
| `landing/lib/landing-content.ts` | Hero/how-it-works copy, three team entries, three hardcoded orchestration cases, commands, source URLs |
| `landing/lib/orchestration-demo.ts` | Pure phase, checkpoint, and lane transition functions |
| `landing/tests/orchestration-demo.test.ts` | Phase order, role returns, reduced-motion/static state, and completion tests |
| `landing/lib/clipboard.ts` | Truthful async clipboard result |
| `landing/tests/clipboard.test.ts` | Clipboard success, rejection, and missing API |
| `landing/components/workflow-run-demo.tsx` | Control-tower layout, viewport autoplay, visibility pause/resume, case tabs, Replay, live status |
| `landing/components/featured-team-section.tsx` | Startup feature plus Finance and Market companion cards |
| `landing/components/landing-page.tsx` | Codex-first hero, demo CTA, section order, safe command copying |
| `landing/components/flow-diagram.tsx` | Server-rendered compact goal → coordinator → specialists → verified-result fallback |
| `landing/components/{copyable-command,terminal-block}.tsx` | Shared truthful copy feedback |
| `landing/app/globals.css` | Packet, connector, role-lane, convergence, and reduced-motion styles |
| `tests/landing-app.test.ts` | Source contract, section order, animation/accessibility/clipboard markers |
| `tests/landing-skill-hub.test.ts` | Three-team manifest parity and featured-workflow exclusion |
| `docs/landing-content.md`, `docs/landing-content.zh-Hant.md` | English and Traditional Chinese visible-content mirrors |
| `landing/design.md` | Updated local design guidance for three featured teams and control-tower motion |

### Task 1: Model three real teams and three hardcoded cases

**Files:**
- Modify: `tests/landing-skill-hub.test.ts`
- Modify: `tests/landing-app.test.ts`
- Modify: `landing/lib/landing-content.ts`

- [ ] **Step 1: Add failing team parity tests**

Change imports to include `financeTeam`, `marketTeam`, `orchestrationCases`, and `teams`, then add:

First extend the existing test helper so repository-local companion paths resolve to their skill name:

```ts
function displayName(source: string) {
  if (source.startsWith("./skills/")) return source.slice("./skills/".length);
  if (source.startsWith("catalog:")) return source.slice("catalog:".length);
  const localSkillMarker = "/skills/";
  const localSkillIndex = source.lastIndexOf(localSkillMarker);
  if (localSkillIndex >= 0) return source.slice(localSkillIndex + localSkillMarker.length);
  return source;
}
```

Replace the existing team special case in `mirrors workflow manifests and the pre-publication team roster` with manifest parity for every entry:

```ts
for (const entry of catalogEntries) {
  const manifest = JSON.parse(readFileSync(manifestPath(entry), "utf8")) as {
    skills: Array<{ source: string }>;
  };
  expect(entry.skills.map(({ name }) => name)).toEqual(
    manifest.skills.map(({ source }) => displayName(source)),
  );
}
```

Then add:

```ts
test("models all featured teams from their real manifests", () => {
  expect(teams.map(({ slug }) => slug)).toEqual(["startup-team", "finance-team", "market-team"]);
  for (const team of teams) {
    const manifest = JSON.parse(readFileSync(manifestPath(team), "utf8")) as {
      coordinator: string;
      members: string[];
    };
    expect(team.coordinator.skill).toBe(displayName(manifest.coordinator));
    expect(team.members.map(({ skill }) => skill)).toEqual(
      manifest.members.map((source) => displayName(source)),
    );
    expect(workflows.some(({ slug }) => slug === team.slug)).toBe(false);
  }
  expect(financeTeam.entrySkill).toBe("finance-research");
  expect(marketTeam.entrySkill).toBe("market-research");
});

test("maps every orchestration case to a real featured team", () => {
  expect(orchestrationCases.map(({ teamSlug }) => teamSlug)).toEqual([
    "startup-team",
    "finance-team",
    "market-team",
  ]);
  for (const orchestrationCase of orchestrationCases) {
    const team = teams.find(({ slug }) => slug === orchestrationCase.teamSlug);
    expect(team).toBeDefined();
    expect(orchestrationCase.installCommand).toBe(team?.installCommand);
    expect(orchestrationCase.previewLabel).toBe("Example run · hardcoded preview");
  }
});
```

- [ ] **Step 2: Observe failure**

```bash
rtk bun test tests/landing-skill-hub.test.ts --test-name-pattern "featured teams|orchestration case"
```

Expected: FAIL because the exports do not exist.

- [ ] **Step 3: Add the content types**

Add to `landing-content.ts`:

```ts
export type OrchestrationLaneKind = "planning" | "implementation" | "verification";

export interface OrchestrationLaneContent {
  skill: string;
  label: string;
  owner: string;
  kind: OrchestrationLaneKind;
  activity: readonly string[];
  result: string;
  sourceUrl: string;
}

export interface OrchestrationCaseContent {
  id: string;
  teamSlug: "startup-team" | "finance-team" | "market-team";
  title: string;
  subtitle: string;
  previewLabel: "Example run · hardcoded preview";
  prompt: string;
  outcome: string;
  coordinator: OrchestrationLaneContent;
  parallelLanes: readonly OrchestrationLaneContent[];
  gatedLanes: readonly OrchestrationLaneContent[];
  installCommand: string;
}
```

- [ ] **Step 4: Add Finance Team and Market Team content**

Create `financeTeam` and `marketTeam` as complete `TeamCardContent` objects matching the approved spec and real manifests. Use exact source roots:

```ts
sourceUrl: `${githubUrl}/tree/main/examples/teams/finance-team`
sourceUrl: `${githubUrl}/tree/main/examples/teams/market-team`
```

Set `localSkillNames` to `finance-research` or `market-research`; set every coordinator/member `skillSourceUrls` to its exact team or workflow SKILL.md; include every manifest skill in `skills`; and use these commands:

```ts
installCommand: "npx omniskill@latest install finance-team"
installCommand: "npx omniskill@latest install market-team"
```

Export:

```ts
export const teams: TeamCardContent[] = [startupTeam, financeTeam, marketTeam];
export const catalogEntries: CatalogEntryContent[] = [...teams, ...workflows];
```

- [ ] **Step 5: Add the exact case identities**

Add this constructor so every lane has a checked source URL:

```ts
function makeLane(input: Omit<OrchestrationLaneContent, "sourceUrl"> & { sourceUrl?: string }) {
  if (!input.sourceUrl) throw new Error(`Missing orchestration source URL for ${input.skill}`);
  return { ...input, sourceUrl: input.sourceUrl };
}
```

Export `orchestrationCases` with these exact values:

```ts
export const orchestrationCases: readonly OrchestrationCaseContent[] = [
  {
    id: "landing-page",
    teamSlug: "startup-team",
    title: "Build a landing page",
    subtitle: "Turn one product goal into a responsive, verified release.",
    previewLabel: "Example run · hardcoded preview",
    prompt: "$startup-goal Build and ship a landing page for an AI finance product.",
    outcome: "Approved direction, implementation slice, and verified release checklist ready.",
    installCommand: startupTeam.installCommand,
    coordinator: makeLane({ skill: "startup-goal", label: "Route goal", owner: "Coordinator", kind: "planning", activity: ["Clarify audience and promise", "Present scope for approval", "Select the smallest role set"], result: "Approved route and role briefs ready.", sourceUrl: startupTeam.skillSourceUrls?.["startup-goal"] }),
    parallelLanes: [
      makeLane({ skill: "product-manager", label: "Product scope", owner: "PM", kind: "planning", activity: ["Define visitor outcome", "Write acceptance criteria", "Cut unrelated scope"], result: "Page hierarchy and acceptance criteria ready.", sourceUrl: startupTeam.skillSourceUrls?.["product-manager"] }),
      makeLane({ skill: "web-design", label: "Interface direction", owner: "Design", kind: "planning", activity: ["Set responsive hierarchy", "Define control-tower motion", "Review reduced-motion behavior"], result: "Responsive visual and motion direction ready.", sourceUrl: startupTeam.skillSourceUrls?.["web-design"] }),
      makeLane({ skill: "founding-engineer", label: "Implementation frame", owner: "Engineer", kind: "planning", activity: ["Map current components", "Define the smallest write slice", "Name tests and rollback"], result: "Read-only implementation handoff ready.", sourceUrl: startupTeam.skillSourceUrls?.["founding-engineer"] }),
    ],
    gatedLanes: [
      makeLane({ skill: "mattpocock:implement", label: "Implement", owner: "Implementer", kind: "implementation", activity: ["Write tests first", "Build the approved slice", "Run focused checks"], result: "Landing implementation and focused tests complete.", sourceUrl: "https://github.com/mattpocock/skills/blob/v1.1.0/skills/engineering/implement/SKILL.md" }),
      makeLane({ skill: "qa-lead", label: "Verify", owner: "QA", kind: "verification", activity: ["Check acceptance", "Test responsive and keyboard states", "Report residual risk"], result: "Release verification passed.", sourceUrl: startupTeam.skillSourceUrls?.["qa-lead"] }),
    ],
  },
  {
    id: "stock-research",
    teamSlug: "finance-team",
    title: "Research a stock",
    subtitle: "Build a sourced company thesis without inventing missing data.",
    previewLabel: "Example run · hardcoded preview",
    prompt: "$finance-research Research NVDA as a 12-month watchlist candidate using public sources.",
    outcome: "Sourced thesis, scenarios, catalysts, risks, and invalidation conditions ready.",
    installCommand: financeTeam.installCommand,
    coordinator: makeLane({ skill: "finance-research", label: "Route research", owner: "Finance lead", kind: "planning", activity: ["Clarify ticker and horizon", "Approve source policy", "Dispatch selected analysts"], result: "Approved finance research route ready.", sourceUrl: financeTeam.skillSourceUrls?.["finance-research"] }),
    parallelLanes: [
      makeLane({ skill: "company-analysis", label: "Company", owner: "Company analyst", kind: "planning", activity: ["Read primary filings", "Assess competitive position", "Separate claims from evidence"], result: "Company evidence memo ready.", sourceUrl: financeTeam.skillSourceUrls?.["company-analysis"] }),
      makeLane({ skill: "financial-analysis", label: "Financials", owner: "Financial analyst", kind: "planning", activity: ["Trace revenue and margins", "Review cash flow and balance sheet", "Flag accounting signals"], result: "Financial-quality memo ready.", sourceUrl: financeTeam.skillSourceUrls?.["financial-analysis"] }),
      makeLane({ skill: "valuation-analysis", label: "Valuation", owner: "Valuation analyst", kind: "planning", activity: ["Define scenario assumptions", "Test sensitivity", "Map catalysts and expectations"], result: "Valuation scenarios ready.", sourceUrl: financeTeam.skillSourceUrls?.["valuation-analysis"] }),
    ],
    gatedLanes: [makeLane({ skill: "risk-analysis", label: "Challenge thesis", owner: "Risk", kind: "verification", activity: ["Find contradictory evidence", "Audit missing sources", "Write invalidation conditions"], result: "Risk and source verification complete.", sourceUrl: financeTeam.skillSourceUrls?.["risk-analysis"] })],
  },
  {
    id: "market-research",
    teamSlug: "market-team",
    title: "Research the market",
    subtitle: "Combine macro, rates, breadth, and leadership into one regime view.",
    previewLabel: "Example run · hardcoded preview",
    prompt: "$market-research Assess whether U.S. equities are risk-on or fragile using macro, rates, breadth, and sector leadership.",
    outcome: "Regime scenarios, probabilities, triggers, risks, and invalidation signals ready.",
    installCommand: marketTeam.installCommand,
    coordinator: makeLane({ skill: "market-research", label: "Route research", owner: "Market lead", kind: "planning", activity: ["Clarify market and horizon", "Approve evidence scope", "Dispatch selected analysts"], result: "Approved market research route ready.", sourceUrl: marketTeam.skillSourceUrls?.["market-research"] }),
    parallelLanes: [
      makeLane({ skill: "macro-analysis", label: "Macro", owner: "Macro analyst", kind: "planning", activity: ["Assess growth and inflation", "Review policy and liquidity", "Map the event calendar"], result: "Macro regime memo ready.", sourceUrl: marketTeam.skillSourceUrls?.["macro-analysis"] }),
      makeLane({ skill: "rates-analysis", label: "Rates", owner: "Rates analyst", kind: "planning", activity: ["Read the curve", "Assess real rates and credit", "Map market transmission"], result: "Rates and credit memo ready.", sourceUrl: marketTeam.skillSourceUrls?.["rates-analysis"] }),
      makeLane({ skill: "market-structure", label: "Structure", owner: "Structure analyst", kind: "planning", activity: ["Measure breadth", "Review volatility and concentration", "Check technical confirmation"], result: "Market-structure memo ready.", sourceUrl: marketTeam.skillSourceUrls?.["market-structure"] }),
      makeLane({ skill: "sector-analysis", label: "Sectors", owner: "Sector analyst", kind: "planning", activity: ["Rank leadership", "Check rotation", "Map earnings and policy sensitivity"], result: "Sector-leadership memo ready.", sourceUrl: marketTeam.skillSourceUrls?.["sector-analysis"] }),
    ],
    gatedLanes: [makeLane({ skill: "risk-analysis", label: "Challenge regime", owner: "Risk", kind: "verification", activity: ["Find contradictory signals", "Audit missing evidence", "Write triggers and invalidation"], result: "Regime risk verification complete.", sourceUrl: marketTeam.skillSourceUrls?.["risk-analysis"] })],
  },
];
```

- [ ] **Step 6: Run tests and commit**

```bash
rtk bun test tests/landing-skill-hub.test.ts
rtk git add landing/lib/landing-content.ts tests/landing-skill-hub.test.ts tests/landing-app.test.ts
rtk git commit -m "feat: model landing orchestration teams"
```

Expected: PASS.

### Task 2: Extract and test the pure orchestration state machine

**Files:**
- Create: `landing/lib/orchestration-demo.ts`
- Create: `landing/tests/orchestration-demo.test.ts`

- [ ] **Step 1: Write the failing state tests**

```ts
import { describe, expect, test } from "bun:test";
import {
  getInitialPhase,
  getLaneStatus,
  getNextPhase,
  type OrchestrationPhase,
} from "../lib/orchestration-demo";

describe("orchestration demo state", () => {
  test("walks clarify, approval, dispatch, collection, synthesis, verification, complete", () => {
    const phases: OrchestrationPhase[] = [];
    let phase = getInitialPhase(false);
    for (let index = 0; index < 10 && phase.kind !== "complete"; index += 1) {
      phases.push(phase);
      phase = getNextPhase(phase, { parallelLaneCount: 3, gatedLaneCount: 1 });
    }
    phases.push(phase);
    expect(phases.map(({ kind }) => kind)).toEqual([
      "clarify",
      "approval",
      "dispatch",
      "collecting",
      "collecting",
      "collecting",
      "collecting",
      "synthesizing",
      "verifying",
      "complete",
    ]);
  });

  test("uses the complete static state for reduced motion", () => {
    expect(getInitialPhase(true)).toEqual({ kind: "complete" });
  });

  test("reports lane state without relying on color", () => {
    expect(getLaneStatus({ kind: "dispatch" }, 0)).toBe("active");
    expect(getLaneStatus({ kind: "collecting", returnedLaneCount: 1 }, 0)).toBe("complete");
    expect(getLaneStatus({ kind: "collecting", returnedLaneCount: 1 }, 1)).toBe("active");
    expect(getLaneStatus({ kind: "complete" }, 2)).toBe("complete");
  });
});
```

- [ ] **Step 2: Observe failure**

```bash
rtk bun test landing/tests/orchestration-demo.test.ts
```

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement the pure module**

```ts
export type LaneStatus = "queued" | "active" | "complete";

export type OrchestrationPhase =
  | { kind: "clarify" }
  | { kind: "approval" }
  | { kind: "dispatch" }
  | { kind: "collecting"; returnedLaneCount: number }
  | { kind: "synthesizing" }
  | { kind: "verifying"; completedGateCount: number }
  | { kind: "complete" };

export interface OrchestrationShape {
  parallelLaneCount: number;
  gatedLaneCount: number;
}

export const COMPLETE_PHASE: OrchestrationPhase = { kind: "complete" };

export function getInitialPhase(reducedMotion: boolean): OrchestrationPhase {
  return reducedMotion ? COMPLETE_PHASE : { kind: "clarify" };
}

export function getNextPhase(
  phase: OrchestrationPhase,
  shape: OrchestrationShape,
): OrchestrationPhase {
  switch (phase.kind) {
    case "clarify": return { kind: "approval" };
    case "approval": return { kind: "dispatch" };
    case "dispatch": return { kind: "collecting", returnedLaneCount: 0 };
    case "collecting":
      return phase.returnedLaneCount < shape.parallelLaneCount
        ? { kind: "collecting", returnedLaneCount: phase.returnedLaneCount + 1 }
        : { kind: "synthesizing" };
    case "synthesizing":
      return shape.gatedLaneCount === 0
        ? COMPLETE_PHASE
        : { kind: "verifying", completedGateCount: 0 };
    case "verifying":
      return phase.completedGateCount + 1 < shape.gatedLaneCount
        ? { kind: "verifying", completedGateCount: phase.completedGateCount + 1 }
        : COMPLETE_PHASE;
    case "complete": return COMPLETE_PHASE;
  }
}

export function getLaneStatus(phase: OrchestrationPhase, laneIndex: number): LaneStatus {
  if (phase.kind === "dispatch") return "active";
  if (phase.kind === "collecting") {
    return laneIndex < phase.returnedLaneCount ? "complete" : "active";
  }
  if (["synthesizing", "verifying", "complete"].includes(phase.kind)) return "complete";
  return "queued";
}
```

- [ ] **Step 4: Run and commit**

```bash
rtk bun test landing/tests/orchestration-demo.test.ts
rtk git add landing/lib/orchestration-demo.ts landing/tests/orchestration-demo.test.ts
rtk git commit -m "feat: model orchestration demo phases"
```

Expected: PASS.

### Task 3: Make clipboard feedback truthful

**Files:**
- Create: `landing/lib/clipboard.ts`
- Create: `landing/tests/clipboard.test.ts`
- Modify: `landing/components/copyable-command.tsx`
- Modify: `landing/components/terminal-block.tsx`
- Modify: `landing/components/landing-page.tsx`

- [ ] **Step 1: Write failing helper tests**

```ts
import { describe, expect, test } from "bun:test";
import { copyText } from "../lib/clipboard";

describe("copyText", () => {
  test("returns true only when clipboard writing succeeds", async () => {
    expect(await copyText("command", { writeText: async () => undefined })).toBe(true);
    expect(await copyText("command", { writeText: async () => { throw new Error("denied"); } })).toBe(false);
    expect(await copyText("command", undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Implement helper**

```ts
export interface ClipboardWriter {
  writeText(value: string): Promise<void>;
}

export async function copyText(value: string, clipboard: ClipboardWriter | undefined) {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Update callers**

Replace fire-and-forget writes with awaited `copyText(command, navigator.clipboard)`. Set `Copied` only on `true`; on `false`, keep the full visible command and set the polite status label to `Select and copy command` without hiding or truncating the text.

- [ ] **Step 4: Run and commit**

```bash
rtk bun test landing/tests/clipboard.test.ts tests/landing-app.test.ts
rtk git add landing/lib/clipboard.ts landing/tests/clipboard.test.ts landing/components/copyable-command.tsx landing/components/terminal-block.tsx landing/components/landing-page.tsx tests/landing-app.test.ts
rtk git commit -m "fix: report clipboard failures truthfully"
```

### Task 4: Replace the transcript with the control-tower workbench

**Files:**
- Modify: `landing/components/workflow-run-demo.tsx`
- Modify: `landing/app/globals.css`
- Modify: `tests/landing-app.test.ts`

- [ ] **Step 1: Replace old source-contract assertions with failing control-tower assertions**

Read `components/workflow-run-demo.tsx` into `demo` and `lib/landing-content.ts` into `content`, then assert all of these exact markers:

```ts
expect(demo).toContain("orchestrationCases");
expect(demo).toContain('role="tablist"');
expect(demo).toContain('role="tab"');
expect(demo).toContain("ArrowRight");
expect(demo).toContain("ArrowLeft");
expect(demo).toContain("Home");
expect(demo).toContain("End");
expect(demo).toContain("IntersectionObserver");
expect(demo).toContain("document.visibilityState");
expect(demo).toContain('aria-live="polite"');
expect(content).toContain("Example run · hardcoded preview");
expect(demo).toContain("previewLabel");
expect(demo).toContain("parallelLanes");
expect(demo).toContain("gatedLanes");
expect(demo).toContain("Replay");
expect(demo).not.toContain("Idea to v1");
expect(demo).not.toContain("Pivot or focus");
expect(demo).not.toContain("Customer request");
```

- [ ] **Step 2: Observe failure**

```bash
rtk bun test tests/landing-app.test.ts --test-name-pattern "control-tower"
```

Expected: FAIL against the old transcript structure.

- [ ] **Step 3: Implement the component boundary**

Import `orchestrationCases`, `OrchestrationCaseContent`, and the pure phase helpers. Keep these focused components in the same file:

```ts
CaseTabs
GoalPacket
CoordinatorNode
ParallelLaneGrid
ConvergenceNode
VerificationGate
ResultPanel
```

The main component owns only:

```ts
const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);
const [phase, setPhase] = useState<OrchestrationPhase>(() => getInitialPhase(reducedMotion));
const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
const [isDocumentVisible, setIsDocumentVisible] = useState(true);
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Use a proper tablist with roving `tabIndex`; ArrowLeft/ArrowRight wrap, Home selects index 0, and End selects the last case. Selecting a case resets and starts it because selection is explicit user intent.

At viewport threshold `0.5`, set `hasEnteredViewport` once and disconnect. If IntersectionObserver is missing, render `COMPLETE_PHASE` and retain Replay instead of starting invisible timers. While `document.visibilityState !== "visible"`, clear the active timer; when visible, schedule the next phase from the current state.

Render desktop as coordinator → horizontal `parallelLanes` → convergence → vertical `gatedLanes` → result. Render mobile using the same DOM order in one column. Every node carries `data-status` plus visible status text (`queued`, `active`, `complete`). The live region announces only the phase label.

- [ ] **Step 4: Add restrained motion CSS**

Add classes and keyframes:

```css
.orchestration-packet { animation: packet-enter 180ms var(--ease-out) both; }
.orchestration-lane[data-status="active"] { animation: active-role-pulse 180ms var(--ease-out) both; }
.orchestration-connector::after { transition: transform 180ms var(--ease-out); transform: scaleX(0); transform-origin: left; }
.orchestration-connector[data-status="active"]::after,
.orchestration-connector[data-status="complete"]::after { transform: scaleX(1); }

@keyframes packet-enter {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Inside the existing reduced-motion media query, disable packet/lane animations and connector transforms, and ensure all nodes remain opaque and visible.

- [ ] **Step 5: Run and commit**

```bash
rtk bun test landing/tests/orchestration-demo.test.ts tests/landing-app.test.ts
rtk bun run typecheck
rtk git add landing/components/workflow-run-demo.tsx landing/app/globals.css tests/landing-app.test.ts
rtk git commit -m "feat: add control tower orchestration demo"
```

Run the typecheck command from `landing/`. Expected: tests and typecheck PASS.

### Task 5: Reposition the hero and expand featured teams

**Files:**
- Modify: `landing/components/landing-page.tsx`
- Modify: `landing/components/featured-team-section.tsx`
- Modify: `landing/components/flow-diagram.tsx`
- Modify: `landing/lib/landing-content.ts`
- Modify: `tests/landing-app.test.ts`

- [ ] **Step 1: Add failing copy and structure assertions**

Read `components/landing-page.tsx` into `page`, `components/featured-team-section.tsx` into `featuredTeam`, and `components/flow-diagram.tsx` into `flowDiagram`, then add:

```ts
expect(page).toContain("Orchestration for Codex");
expect(page).toContain("One goal. A team of agents. One verified result.");
expect(page).toContain('href="#workflow-example"');
expect(page).toContain("Watch a team run");
expect(page).toContain("<FlowDiagram");
expect(page).toContain("<FeaturedTeamSection teams={teams}");
expect(flowDiagram).toContain("Goal");
expect(flowDiagram).toContain("Coordinator");
expect(flowDiagram).toContain("Specialist team");
expect(flowDiagram).toContain("Verified result");
expect(featuredTeam).toContain("const [startupTeam, ...companionTeams] = teams");
expect(featuredTeam).toContain("companionTeams.map");
```

- [ ] **Step 2: Observe failure**

```bash
rtk bun test tests/landing-app.test.ts --test-name-pattern "Codex|featured team"
```

- [ ] **Step 3: Update composition**

Import `teams` instead of only `startupTeam`. Keep the hero install command as Startup Team. Replace the hero eyebrow, headline, and body with the approved content; primary CTA scrolls to `#workflow-example`, while the copyable install command remains adjacent.

Change the section heading to `Watch Codex orchestrate a real team.` and explain that the visible run is a hardcoded preview of a real installable team.

Render `FlowDiagram` beside the approved three-step `howItWorks` content. Its server-rendered DOM is a compact static sequence—Goal → Coordinator → Specialist team → Verified result—so the orchestration model remains understandable when JavaScript or motion is unavailable. It must not run timers or duplicate the detailed case transcript.

Change the featured component signature:

```ts
export function FeaturedTeamSection({ teams }: { teams: readonly TeamCardContent[] }) {
  const [startupTeam, ...companionTeams] = teams;
  if (!startupTeam) return null;
  // existing full-width Startup Team article
  // two-column companionTeams grid with coordinator, members, install, detail, and source actions
}
```

The companion card copy label is computed from the team name, not hardcoded to Startup Team. Keep the `#workflows` anchor and one outer Reveal; do not reintroduce duplicate Skill Hub entries.

- [ ] **Step 4: Run and commit**

```bash
rtk bun test tests/landing-app.test.ts tests/landing-skill-hub.test.ts
rtk git add landing/components/landing-page.tsx landing/components/featured-team-section.tsx landing/components/flow-diagram.tsx landing/lib/landing-content.ts tests/landing-app.test.ts
rtk git commit -m "feat: position landing around codex orchestration"
```

### Task 6: Mirror content and local design guidance

**Files:**
- Modify: `docs/landing-content.md`
- Modify: `docs/landing-content.zh-Hant.md`
- Modify: `landing/design.md`
- Modify: `tests/landing-app.test.ts`

- [ ] **Step 1: Add failing mirror assertions**

Assert both mirrors contain the exact identifiers, commands, preview label, headline, and all three case titles. Assert `landing/design.md` describes three featured teams, control-tower fan-out/fan-in, one-time autoplay, Replay, mobile stacking, and reduced-motion static output.

- [ ] **Step 2: Update the documents**

Mirror the approved runtime content from `landing-content.ts`. Preserve commands and skill identifiers verbatim in Traditional Chinese. Remove old statements that Startup Team is the sole featured item or that the demo contains only startup cases.

- [ ] **Step 3: Run and commit**

```bash
rtk bun test tests/landing-app.test.ts
rtk git add docs/landing-content.md docs/landing-content.zh-Hant.md landing/design.md tests/landing-app.test.ts
rtk git commit -m "docs: mirror codex orchestration landing"
```

### Task 7: Verify responsive interaction and final gates

**Files:**
- Modify only when a failing check identifies an in-scope defect in files already named above.

- [ ] **Step 1: Run landing checks**

```bash
rtk bun run check
```

Run from `landing/`. Expected: landing tests, Next type generation, TypeScript, and production build PASS.

- [ ] **Step 2: Start and confirm the development server**

```bash
rtk bun run dev
```

Confirm the printed localhost URL responds before browser automation.

- [ ] **Step 3: Browser smoke at 320, 768, and 1440 px**

At each width verify no horizontal scroll, readable packet/connector labels, visible complete static content, and usable install commands. Also verify:

- initial case auto-plays once at 50% viewport visibility and does not loop;
- page visibility pauses and resumes the current phase;
- Finance and Market tab selection starts the selected run;
- ArrowLeft, ArrowRight, Home, and End move tab selection and focus;
- Replay restarts only the active case;
- reduced-motion renders the complete static flow without packet travel, lane pulse, or connector sweep;
- clipboard denial never shows `Copied` and leaves the command selectable;
- Startup, Finance, and Market detail/source links resolve.

- [ ] **Step 4: Run the repository gate**

From the repository root:

```bash
rtk bun run check
rtk proxy git diff --check
```

Expected: Biome, typecheck, coverage at or above 90%, all root/landing tests, build, and whitespace checks PASS.

- [ ] **Step 5: Inspect final scope**

```bash
rtk git status --short
rtk git diff --stat
```

Expected: only files named in the two approved plans plus pre-existing user changes; no generated browser artifacts, lockfile churn, or unrelated refactor.
