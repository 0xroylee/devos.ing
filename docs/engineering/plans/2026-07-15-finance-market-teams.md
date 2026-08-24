# Finance and Market Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use mattpocock:subagent-driven-development (recommended) or mattpocock:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship real `finance-team` and `market-team` packages whose verified specialist sub-agents produce provider-neutral public-company and market research.

**Architecture:** Add eight small, independently installable analysis workflows under `examples/workflows/`, then compose them with two local coordinator skills under `examples/teams/`. Reuse the existing first-class team schema, catalog alias resolver, native orchestration assignments, recursive dependency graph, and root-only install record behavior; no runtime TypeScript change is expected unless a focused test exposes a real gap.

**Tech Stack:** Bun, TypeScript, Zod-validated `workflow.json`, Markdown skills, native Omniskills orchestration, Bun test, Biome, Ponytrail snapshots

---

## Execution rules

- Run every shell command through `rtk`.
- Preserve all pre-existing worktree changes; snapshot, stage, and commit only the files named by the active task.
- Follow red-green-refactor order for every task.
- Use `pony-trail` before and immediately after every mutation group.
- Do not add an npm dependency, API key, provider SDK, scraping adapter, or workspace-write role.
- Do not generate a lock until every catalog child exists in a public commit that the lock can resolve. An omitted pre-publication lock is the required state for this branch.
- Research output must be decision-ready but non-prescriptive: no personalized buy, sell, entry, or position-size call.

## File map

| File group | Responsibility |
| --- | --- |
| `examples/workflows/{company,financial,valuation,risk}-analysis/` | Finance specialist workflow, README, manifest, and single local entry skill |
| `examples/workflows/{macro,rates,sector}-analysis/` | Market specialist workflow, README, manifest, and single local entry skill |
| `examples/workflows/market-structure/` | Breadth, volatility, concentration, and technical-confirmation specialist |
| `examples/teams/finance-team/` | `$finance-research` coordinator, native role assignments, public team docs |
| `examples/teams/market-team/` | `$market-research` coordinator, native role assignments, public team docs |
| `tests/workflow-bundles.test.ts` | Manifest, roster, orchestration, dependency graph, shared risk member, and pre-publication lock tests |
| `tests/readme.test.ts` | Public names, commands, coordinator distinction, no-API and non-advice contract |
| `README.md`, `README.zh-Hant.md` | Public team catalog and runnable examples |
| `docs/architecture.md` | Research-team composition and root-only install record contract |

## Exact specialist contracts

| Workflow | Entry skill | Required input | Required output |
| --- | --- | --- | --- |
| `company-analysis` | `$company-analysis` | company/ticker, horizon, question, as-of expectation | business model, competitive position, filing evidence, management claims, events, limitations |
| `financial-analysis` | `$financial-analysis` | company/ticker, horizon, available filings | revenue, margins, cash flow, balance sheet, accounting signals, trend consistency, limitations |
| `valuation-analysis` | `$valuation-analysis` | company/ticker, horizon, available price/financial evidence | base/bull/bear assumptions, sensitivity, expectation risk, catalysts, limitations |
| `risk-analysis` | `$risk-analysis` | synthesized draft, source list, decision horizon | contradictions, missing evidence, failure modes, triggers, invalidation, verification verdict |
| `macro-analysis` | `$macro-analysis` | geography, asset scope, horizon, as-of expectation | growth, inflation, policy, liquidity, calendar, scenario implications, limitations |
| `rates-analysis` | `$rates-analysis` | geography, horizon, available curve/credit evidence | curve, real/nominal rates, credit, transmission, scenario implications, limitations |
| `market-structure` | `$market-structure` | market/index, horizon, available breadth/volatility evidence | breadth, volatility, concentration, positioning proxies, technical confirmation, limitations |
| `sector-analysis` | `$sector-analysis` | market/index, horizon, available sector evidence | leadership, rotation, relative strength, earnings/policy sensitivity, limitations |

Every specialist skill must use this exact process, with the table row supplying the input and output fields:

```markdown
## Process

1. Restate the assigned question, horizon, and as-of expectation.
2. List the available sources and classify each as primary or secondary.
3. Produce only the assigned analysis fields.
4. Separate sourced facts, calculations, and inference.
5. Mark blocked, stale, conflicting, or missing evidence explicitly.
6. Return a concise artifact to the parent coordinator; do not issue personalized trade advice.

## Source policy

Use browsing or search tools already available in the host agent. Do not require an API key. Prefer regulator, issuer, central-bank, treasury, statistics-agency, exchange, and index-provider sources before secondary reporting. Include an as-of statement and source links when the host supports them. Never invent a number to fill a source gap.
```

### Task 1: Add failing public research bundle contracts

**Files:**
- Modify: `tests/workflow-bundles.test.ts`
- Modify: `tests/readme.test.ts`

- [ ] **Step 1: Add the failing bundle test**

Add this test beside the existing Startup Team public-example test:

```ts
test("ships Finance Team and Market Team as real catalog-composed teams", async () => {
  const cases = [
    {
      name: "finance-team",
      coordinator: "./skills/finance-research",
      members: [
        "catalog:company-analysis",
        "catalog:financial-analysis",
        "catalog:valuation-analysis",
        "catalog:risk-analysis",
      ],
      planning: [
        "catalog:company-analysis",
        "catalog:financial-analysis",
        "catalog:valuation-analysis",
      ],
    },
    {
      name: "market-team",
      coordinator: "./skills/market-research",
      members: [
        "catalog:macro-analysis",
        "catalog:rates-analysis",
        "catalog:market-structure",
        "catalog:sector-analysis",
        "catalog:risk-analysis",
      ],
      planning: [
        "catalog:macro-analysis",
        "catalog:rates-analysis",
        "catalog:market-structure",
        "catalog:sector-analysis",
      ],
    },
  ] as const;

  for (const expected of cases) {
    const bundle = await loadWorkflowBundle(
      join(import.meta.dir, "..", "examples", "teams", expected.name),
    );
    expect(bundle.manifest).toMatchObject({
      kind: "team",
      name: expected.name,
      coordinator: expected.coordinator,
      members: [...expected.members],
    });
    expect(bundle.manifest.skills).toContainEqual({
      source: expected.coordinator,
      entry: true,
    });
    expect(bundle.lock).toBeUndefined();
    expect(bundle.manifest.orchestration?.roles[expected.coordinator]).toMatchObject({
      tier: "deep",
      modelRole: "planning",
      access: "read-only",
      consultation: "receive",
    });
    for (const member of expected.planning) {
      expect(bundle.manifest.orchestration?.roles[member]).toMatchObject({
        tier: "deep",
        modelRole: "planning",
        access: "read-only",
        consultation: "request",
      });
    }
    expect(bundle.manifest.orchestration?.roles["catalog:risk-analysis"]).toMatchObject({
      tier: "deep",
      modelRole: "verification",
      access: "read-only",
      consultation: "request",
    });
    expect(
      Object.values(bundle.manifest.orchestration?.roles ?? {}).some(
        ({ access }) => access === "workspace-write",
      ),
    ).toBe(false);
  }
});
```

- [ ] **Step 2: Add the failing documentation contract**

Add to `tests/readme.test.ts`:

```ts
test("documents the professional research teams without API or advice claims", () => {
  const readme = readReadme();
  for (const value of [
    "Finance Team",
    "Market Team",
    "npx omniskill@latest install finance-team",
    "npx omniskill@latest install market-team",
    "$finance-research",
    "$market-research",
    "public sources",
  ]) {
    expect(readme).toContain(value);
  }
  expect(readme).not.toContain("FMP_API_KEY");
  expect(readme).not.toMatch(/guaranteed return|personalized buy|personalized sell/i);
});
```

- [ ] **Step 3: Observe the failure**

Run:

```bash
rtk bun test tests/workflow-bundles.test.ts --test-name-pattern "Finance Team and Market Team"
rtk bun test tests/readme.test.ts --test-name-pattern "professional research teams"
```

Expected: FAIL because the two team directories and public copy do not exist.

- [ ] **Step 4: Preserve the acceptance harness for the implementation tasks**

Do not commit a knowingly failing repository state. Keep these two test edits in the working tree while Tasks 2–6 implement the contracts. Each implementation task still runs its own focused validation before committing production files; stage the acceptance tests only in the task that makes their assertion green.

### Task 2: Create the four Finance specialist workflows

**Files:**
- Create: `examples/workflows/company-analysis/{README.md,workflow.json,skills/company-analysis/SKILL.md}`
- Create: `examples/workflows/financial-analysis/{README.md,workflow.json,skills/financial-analysis/SKILL.md}`
- Create: `examples/workflows/valuation-analysis/{README.md,workflow.json,skills/valuation-analysis/SKILL.md}`
- Create: `examples/workflows/risk-analysis/{README.md,workflow.json,skills/risk-analysis/SKILL.md}`
- Modify: `tests/workflow-bundles.test.ts`

- [ ] **Step 1: Add a failing specialist-manifest loop**

```ts
test("ships focused research specialist workflows", async () => {
  const names = [
    "company-analysis",
    "financial-analysis",
    "valuation-analysis",
    "risk-analysis",
    "macro-analysis",
    "rates-analysis",
    "market-structure",
    "sector-analysis",
  ];
  for (const name of names) {
    const bundle = await loadWorkflowBundle(
      join(import.meta.dir, "..", "examples", "workflows", name),
    );
    expect(bundle.manifest).toMatchObject({ name, version: "0.1.0" });
    expect(bundle.manifest.skills).toEqual([{ source: `./skills/${name}`, entry: true }]);
    expect(bundle.manifest.steps).toEqual([
      { id: "analyze", title: `Run ${name}`, skill: `./skills/${name}` },
    ]);
  }
});
```

- [ ] **Step 2: Observe the Finance specialist failure**

```bash
rtk bun test tests/workflow-bundles.test.ts --test-name-pattern "focused research specialist"
```

Expected: FAIL first on missing `examples/workflows/company-analysis/workflow.json`.

- [ ] **Step 3: Create the four manifests**

Use this exact JSON shape for each Finance workflow, substituting the exact name and description below:

```json
{
  "schemaVersion": "0.1",
  "name": "company-analysis",
  "version": "0.1.0",
  "description": "Analyze a public company's business, competitive position, filings, management claims, and material events from auditable sources.",
  "skills": [{ "source": "./skills/company-analysis", "entry": true }],
  "steps": [{ "id": "analyze", "title": "Run company-analysis", "skill": "./skills/company-analysis" }]
}
```

Exact remaining descriptions:

- `financial-analysis`: `Analyze revenue, margins, cash flow, balance-sheet quality, accounting signals, and trend consistency from public-company evidence.`
- `valuation-analysis`: `Build explicit base, bull, and bear valuation scenarios with sensitivity, catalysts, and expectation risk.`
- `risk-analysis`: `Challenge a synthesized research draft for contradictory evidence, missing sources, failure modes, triggers, and invalidation.`

Each remaining manifest uses its own exact name in `name`, `skills[0].source`, `steps[0].title`, and `steps[0].skill`.

- [ ] **Step 4: Create the four skills and READMEs**

Each `SKILL.md` starts with this exact frontmatter, using its exact workflow name and table description:

```yaml
---
name: company-analysis
description: Analyze a public company's business, competitive position, filings, management claims, and material events from auditable sources.
---
```

After frontmatter, add `# Company Analysis`, the exact common Process and Source policy from this plan, plus `## Required input` and `## Required output` containing the exact fields in the specialist-contract table. Repeat with exact names/headings for Financial Analysis, Valuation Analysis, and Risk Analysis.

Each README is complete with this structure and exact command:

````markdown
# Company Analysis

Install:

```bash
npx omniskill@latest install company-analysis
```

Invoke `$company-analysis` with a company or ticker, horizon, research question, and as-of expectation. The workflow returns business-model, competitive, filing, event, and limitation evidence for a parent coordinator or standalone user. It uses host-provided browsing and public sources; it requires no API key and does not issue personalized trade advice.
````

Repeat with the exact workflow/skill name and required output from the contract table; do not refer readers to another README.

- [ ] **Step 5: Run focused tests**

```bash
rtk bun run dev -- validate examples/workflows/company-analysis
rtk bun run dev -- validate examples/workflows/financial-analysis
rtk bun run dev -- validate examples/workflows/valuation-analysis
rtk bun run dev -- validate examples/workflows/risk-analysis
```

Expected: all four print successful validation.

- [ ] **Step 6: Commit**

```bash
rtk git add examples/workflows/company-analysis examples/workflows/financial-analysis examples/workflows/valuation-analysis examples/workflows/risk-analysis
rtk git commit -m "feat: add finance research specialists"
```

### Task 3: Create the four Market specialist workflows

**Files:**
- Create: `examples/workflows/macro-analysis/{README.md,workflow.json,skills/macro-analysis/SKILL.md}`
- Create: `examples/workflows/rates-analysis/{README.md,workflow.json,skills/rates-analysis/SKILL.md}`
- Create: `examples/workflows/market-structure/{README.md,workflow.json,skills/market-structure/SKILL.md}`
- Create: `examples/workflows/sector-analysis/{README.md,workflow.json,skills/sector-analysis/SKILL.md}`

- [ ] **Step 1: Confirm the existing specialist test still fails on macro-analysis**

```bash
rtk bun test tests/workflow-bundles.test.ts --test-name-pattern "focused research specialist"
```

Expected: FAIL on missing `examples/workflows/macro-analysis/workflow.json` after the four Finance workflows pass.

- [ ] **Step 2: Create the manifests, skills, and READMEs**

Create each manifest with this complete shape, replacing every shown `macro-analysis` occurrence with the exact workflow name from the list below and using that workflow's exact description:

```json
{
  "schemaVersion": "0.1",
  "name": "macro-analysis",
  "version": "0.1.0",
  "description": "Analyze growth, inflation, policy, liquidity, and the event calendar for a defined market horizon.",
  "skills": [{ "source": "./skills/macro-analysis", "entry": true }],
  "steps": [{ "id": "analyze", "title": "Run macro-analysis", "skill": "./skills/macro-analysis" }]
}
```

Each `SKILL.md` contains its own exact frontmatter name and description, title, Required input fields, Required output fields, and the complete Process and Source policy printed under Exact specialist contracts. Each README contains its own title, install command, invocation, output fields, no-API statement, and non-advice statement. Use these exact descriptions and contract-table input/output fields:

- `macro-analysis`: `Analyze growth, inflation, policy, liquidity, and the event calendar for a defined market horizon.`
- `rates-analysis`: `Analyze yield-curve shape, real and nominal rates, credit conditions, and market transmission.`
- `market-structure`: `Analyze breadth, volatility, concentration, positioning proxies, and technical confirmation.`
- `sector-analysis`: `Analyze leadership, rotation, relative strength, and earnings or policy sensitivity across sectors.`

Each README contains its own install command, invocation, exact output fields, no-API statement, and non-advice statement.

- [ ] **Step 3: Run focused validation and the specialist test**

```bash
rtk bun run dev -- validate examples/workflows/macro-analysis
rtk bun run dev -- validate examples/workflows/rates-analysis
rtk bun run dev -- validate examples/workflows/market-structure
rtk bun run dev -- validate examples/workflows/sector-analysis
rtk bun test tests/workflow-bundles.test.ts --test-name-pattern "focused research specialist"
```

Expected: all commands PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add examples/workflows/macro-analysis examples/workflows/rates-analysis examples/workflows/market-structure examples/workflows/sector-analysis
rtk git commit -m "feat: add market research specialists"
```

### Task 4: Compose Finance Team

**Files:**
- Create: `examples/teams/finance-team/workflow.json`
- Create: `examples/teams/finance-team/README.md`
- Create: `examples/teams/finance-team/skills/finance-research/SKILL.md`
- Modify: `tests/workflow-bundles.test.ts`

- [ ] **Step 1: Create the manifest**

```json
{
  "schemaVersion": "0.1",
  "kind": "team",
  "name": "finance-team",
  "version": "0.1.0",
  "description": "Coordinate company, financial, valuation, and risk specialists into one sourced public-company research brief.",
  "coordinator": "./skills/finance-research",
  "members": ["catalog:company-analysis", "catalog:financial-analysis", "catalog:valuation-analysis", "catalog:risk-analysis"],
  "orchestration": {
    "roles": {
      "./skills/finance-research": { "tier": "deep", "modelRole": "planning", "access": "read-only", "consultation": "receive" },
      "catalog:company-analysis": { "tier": "deep", "modelRole": "planning", "access": "read-only", "consultation": "request" },
      "catalog:financial-analysis": { "tier": "deep", "modelRole": "planning", "access": "read-only", "consultation": "request" },
      "catalog:valuation-analysis": { "tier": "deep", "modelRole": "planning", "access": "read-only", "consultation": "request" },
      "catalog:risk-analysis": { "tier": "deep", "modelRole": "verification", "access": "read-only", "consultation": "request" }
    },
    "support": { "explorer": { "tier": "fast", "modelRole": "planning", "access": "read-only", "consultation": "request" } }
  },
  "skills": [
    { "source": "./skills/finance-research", "entry": true },
    { "source": "catalog:company-analysis" },
    { "source": "catalog:financial-analysis" },
    { "source": "catalog:valuation-analysis" },
    { "source": "catalog:risk-analysis" },
    { "source": "../../workflows/setup-model-routing/skills/setup-model-routing" }
  ],
  "steps": [
    { "id": "scope", "title": "Approve the finance research brief", "skill": "./skills/finance-research", "gate": "human_approval" },
    { "id": "company", "title": "Analyze the company", "skill": "catalog:company-analysis" },
    { "id": "financials", "title": "Analyze the financials", "skill": "catalog:financial-analysis" },
    { "id": "valuation", "title": "Analyze valuation scenarios", "skill": "catalog:valuation-analysis" },
    { "id": "risk", "title": "Verify sources and challenge the thesis", "skill": "catalog:risk-analysis" }
  ]
}
```

- [ ] **Step 2: Write the coordinator skill**

The skill frontmatter is:

```yaml
---
name: finance-research
description: Coordinate a professional public-company research team into one sourced, decision-ready, non-prescriptive brief.
---
```

Its body must implement this exact state machine:

1. Ask one question at a time until company/ticker, horizon, decision question, as-of expectation, source access, output format, and success criteria are clear.
2. Present a compact brief with scope, non-goals, source policy, members, verification, and limitations; require explicit approval.
3. Route only needed members and list skipped members with evidence and re-entry conditions.
4. Run `omniskill dispatch finance-team --role <source> --task <brief> --dry-run --json` for selected members; accept only a present adapter and `evidenceCapability` of at least `launch_configured`.
5. Dispatch company, financial, and valuation members in parallel after approval; disclose role, tier, runtime, model, effort, access, and receipt run id.
6. Combine the returned artifacts, then dispatch `catalog:risk-analysis` against the combined draft.
7. Return thesis, source-backed facts, inference, valuation scenarios, catalysts, risks, invalidation, missing evidence, and as-of statement. Never invent blocked data or issue personalized trade instructions.

The README documents install, `$finance-research` invocation, `deps`, `validate`, verified dispatch, source policy, and the non-advice boundary.

- [ ] **Step 3: Verify Finance Team red test turns green**

```bash
rtk bun run dev -- validate examples/teams/finance-team
rtk bun run dev -- deps examples/teams/finance-team
rtk bun test tests/workflow-bundles.test.ts --test-name-pattern "Finance Team and Market Team"
```

Expected: validation and deps PASS; the test still fails only because Market Team is absent.

- [ ] **Step 4: Commit**

```bash
rtk git add examples/teams/finance-team
rtk git commit -m "feat: add finance research team"
```

### Task 5: Compose Market Team

**Files:**
- Create: `examples/teams/market-team/workflow.json`
- Create: `examples/teams/market-team/README.md`
- Create: `examples/teams/market-team/skills/market-research/SKILL.md`
- Modify: `tests/workflow-bundles.test.ts`

- [ ] **Step 1: Create the manifest**

Use the Finance manifest shape with these exact substitutions:

```json
{
  "schemaVersion": "0.1",
  "kind": "team",
  "name": "market-team",
  "version": "0.1.0",
  "description": "Coordinate macro, rates, market-structure, sector, and risk specialists into one sourced market-regime brief.",
  "coordinator": "./skills/market-research",
  "members": ["catalog:macro-analysis", "catalog:rates-analysis", "catalog:market-structure", "catalog:sector-analysis", "catalog:risk-analysis"],
  "orchestration": {
    "roles": {
      "./skills/market-research": { "tier": "deep", "modelRole": "planning", "access": "read-only", "consultation": "receive" },
      "catalog:macro-analysis": { "tier": "deep", "modelRole": "planning", "access": "read-only", "consultation": "request" },
      "catalog:rates-analysis": { "tier": "deep", "modelRole": "planning", "access": "read-only", "consultation": "request" },
      "catalog:market-structure": { "tier": "deep", "modelRole": "planning", "access": "read-only", "consultation": "request" },
      "catalog:sector-analysis": { "tier": "deep", "modelRole": "planning", "access": "read-only", "consultation": "request" },
      "catalog:risk-analysis": { "tier": "deep", "modelRole": "verification", "access": "read-only", "consultation": "request" }
    },
    "support": { "explorer": { "tier": "fast", "modelRole": "planning", "access": "read-only", "consultation": "request" } }
  },
  "skills": [
    { "source": "./skills/market-research", "entry": true },
    { "source": "catalog:macro-analysis" },
    { "source": "catalog:rates-analysis" },
    { "source": "catalog:market-structure" },
    { "source": "catalog:sector-analysis" },
    { "source": "catalog:risk-analysis" },
    { "source": "../../workflows/setup-model-routing/skills/setup-model-routing" }
  ],
  "steps": [
    { "id": "scope", "title": "Approve the market research brief", "skill": "./skills/market-research", "gate": "human_approval" },
    { "id": "macro", "title": "Analyze macro conditions", "skill": "catalog:macro-analysis" },
    { "id": "rates", "title": "Analyze rates and credit", "skill": "catalog:rates-analysis" },
    { "id": "structure", "title": "Analyze market structure", "skill": "catalog:market-structure" },
    { "id": "sectors", "title": "Analyze sector leadership", "skill": "catalog:sector-analysis" },
    { "id": "risk", "title": "Verify sources and challenge the regime", "skill": "catalog:risk-analysis" }
  ]
}
```

- [ ] **Step 2: Write the coordinator skill and README**

Use frontmatter:

```yaml
---
name: market-research
description: Coordinate a professional market research team into one sourced regime brief with scenarios, triggers, and invalidation.
---
```

The skill body implements this exact state machine:

1. Ask one question at a time until geography, asset scope, horizon, research question, as-of expectation, source access, output format, and success criteria are clear.
2. Present a compact brief with scope, non-goals, source policy, members, verification, and limitations; require explicit approval.
3. Route only needed members and list skipped members with evidence and re-entry conditions.
4. Run `omniskill dispatch market-team --role <source> --task <brief> --dry-run --json` for selected members; accept only a present adapter and `evidenceCapability` of at least `launch_configured`.
5. Dispatch macro, rates, market-structure, and sector members in parallel after approval; disclose role, tier, runtime, model, effort, access, and receipt run id.
6. Combine the returned artifacts, then dispatch `catalog:risk-analysis` against the combined draft.
7. Return regime, primary evidence, inference, scenario probabilities, triggers, invalidation, missing evidence, limitations, and as-of statement. Never invent blocked data or issue personalized trade instructions.

The README documents install, `$market-research` invocation, `deps`, `validate`, verified dispatch, source policy, and the non-advice boundary.

- [ ] **Step 3: Run the full research bundle tests**

```bash
rtk bun run dev -- validate examples/teams/market-team
rtk bun run dev -- deps examples/teams/market-team
rtk bun test tests/workflow-bundles.test.ts --test-name-pattern "research specialist|Finance Team and Market Team"
```

Expected: PASS, including shared `catalog:risk-analysis` resolution and no workspace-write role.

- [ ] **Step 4: Commit**

```bash
rtk git add examples/teams/market-team tests/workflow-bundles.test.ts
rtk git commit -m "feat: add market research team"
```

### Task 6: Document the public research catalog

**Files:**
- Modify: `README.md`
- Modify: `README.zh-Hant.md`
- Modify: `docs/architecture.md`
- Modify: `tests/readme.test.ts`

- [ ] **Step 1: Update public catalog copy**

Add both teams near Startup Team with exact commands and coordinator distinction:

```markdown
### Finance Team

Install `finance-team`, then invoke `$finance-research` to coordinate company, financial, valuation, and risk analysis into one sourced public-company brief.

```bash
npx omniskill@latest install finance-team
```

### Market Team

Install `market-team`, then invoke `$market-research` to coordinate macro, rates, market-structure, sector, and risk analysis into one sourced regime brief.

```bash
npx omniskill@latest install market-team
```

Both teams use host-provided browsing and public sources. They require no market-data API and do not provide personalized investment advice.
```

Mirror the meaning in Traditional Chinese while preserving exact identifiers and commands.

- [ ] **Step 2: Update architecture**

Document that `finance-team` and `market-team` are first-class teams, their catalog member lists, shared `risk-analysis`, read-only orchestration profiles, and root-only install records. State that pre-publication locks remain omitted until every child is available at the pinned public commit.

- [ ] **Step 3: Run documentation tests**

```bash
rtk bun test tests/readme.test.ts --test-name-pattern "professional research teams|authoritative repository guidance"
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add README.md README.zh-Hant.md docs/architecture.md tests/readme.test.ts
rtk git commit -m "docs: publish research team catalog"
```

### Task 7: Verify team graph, CLI smoke, and repository gate

**Files:**
- Modify only if a failing check identifies an in-scope defect in files already listed above.

- [ ] **Step 1: Run focused bundle tests**

```bash
rtk bun test tests/workflow-bundles.test.ts tests/readme.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run CLI smoke**

```bash
rtk bun run dev -- validate examples/teams/finance-team
rtk bun run dev -- deps examples/teams/finance-team
rtk bun run dev -- validate examples/teams/market-team
rtk bun run dev -- deps examples/teams/market-team
```

Expected: both teams validate and both dependency graphs include their coordinator, all catalog members, shared risk analysis, and setup-model-routing support.

- [ ] **Step 3: Run the full gate**

```bash
rtk bun run check
rtk proxy git diff --check
```

Expected: Biome, typecheck, coverage at or above 90%, all tests, and whitespace checks PASS.

- [ ] **Step 4: Inspect the final diff**

```bash
rtk git status --short
rtk git diff --stat
```

Expected: only approved research-team files plus the user's pre-existing changes are present; unrelated changes are not staged.
