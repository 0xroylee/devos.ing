# Startup Team Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use mattpocock:subagent-driven-development (recommended) or mattpocock:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install safe, globally managed Codex and Claude agent profiles for `startup-team` from one vendor-neutral capability-tier configuration.

**Architecture:** Add a generic optional orchestration contract to team manifests, compile it through a pure runtime module, and isolate native filesystem behavior behind a profile-installer plugin. Integrate the resulting profile plan into the existing Omniskills install record and removal lifecycle while keeping `src/cli.ts` thin and preserving legacy skill-only records.

**Tech Stack:** Bun, TypeScript, Zod, Commander, Bun test, Node filesystem APIs, Biome.

**Design specification:** `docs/engineering/specs/2026-07-14-startup-team-orchestration-design.md`

---

## Scope and execution rules

This is one dependent vertical slice, not a set of independent products. The
compiler, target writer, CLI integration, install record, and startup-team
metadata must land in that order because each later task consumes the previous
task's verified interface.

- Use `rtk` for every repository command.
- Use TDD: observe each focused test fail before adding production behavior.
- Do not modify the user's real `~/.codex`, `~/.claude`, or `~/.omniskills`.
- Use temporary homes in tests and `work/orchestration-smoke-home` for smoke
  checks.
- Preserve the honest boundary: fallback and consultation are orchestrator
  protocols, not provider-enforced guarantees.
- Stage only files named by the current task.

## Planned file structure

### New files

- `src/runtimes/omniskill/orchestration.ts` — schemas, defaults, normalization,
  deterministic role-to-profile planning, and Codex/Claude renderers.
- `src/plugins/agent-profile-installer.ts` — global config read/create plan,
  destination preflight, atomic profile batch writes, rollback, hashes, and
  drift-aware removal support.
- `tests/orchestration.test.ts` — pure manifest-independent configuration and
  renderer behavior.
- `tests/agent-profile-installer.test.ts` — temporary-home profile lifecycle.

### Modified files

- `src/runtimes/omniskill/workflow-bundles.ts` — optional manifest contract,
  profile artifact records, and ownership-aware removal.
- `src/runtimes/omniskill/index.ts` — orchestration runtime exports.
- `src/plugins/index.ts` — profile-installer exports.
- `src/omniskill.ts` — install `--dry-run`, orchestration preflight, install,
  reporting, and record integration.
- `tests/workflow-bundles.test.ts` — manifest and installed-record coverage.
- `tests/omniskill.test.ts` — command integration and zero-write dry-run.
- `examples/teams/startup-team/workflow.json` — role and support tier mapping.
- `examples/teams/startup-team/workflow.lock.json` — refreshed expanded lock.
- `examples/teams/startup-team/skills/startup-goal/SKILL.md` — bounded dispatch
  and consultation contract.
- `examples/teams/startup-team/README.md` — configuration, lifecycle, and
  enforcement boundaries.
- `docs/architecture.md` — runtime and plugin ownership.

## Task 1: Add the generic team orchestration manifest contract

**Files:**

- Modify: `src/runtimes/omniskill/workflow-bundles.ts:19-230`
- Test: `tests/workflow-bundles.test.ts:46-75`
- Test: `tests/workflow-bundles.test.ts:1130-1220`

- [ ] **Step 1: Add valid orchestration data to the shared team fixture**

Add this property to `validTeamManifest` in
`tests/workflow-bundles.test.ts`:

```ts
orchestration: {
  roles: {
    "./skills/coordinator": {
      tier: "deep",
      access: "read-only",
      consultation: "receive",
    },
    "catalog:member-workflow": {
      tier: "deep",
      access: "read-only",
      consultation: "request",
    },
    "external-review": {
      tier: "standard",
      access: "workspace-write",
      consultation: "request",
    },
  },
  support: {
    explorer: {
      tier: "fast",
      access: "read-only",
      consultation: "request",
    },
  },
},
```

Extend the parsing assertion:

```ts
expect(team.orchestration?.roles["./skills/coordinator"]).toEqual({
  tier: "deep",
  access: "read-only",
  consultation: "receive",
});
expect(team.orchestration?.support?.explorer.tier).toBe("fast");
```

- [ ] **Step 2: Add failing validation cases**

Add this test below the existing invalid-team test:

```ts
test("rejects invalid team orchestration contracts", () => {
  const invalidCases = [
    {
      manifest: {
        ...validTeamManifest,
        orchestration: {
          ...validTeamManifest.orchestration,
          roles: {
            ...validTeamManifest.orchestration.roles,
            missing: {
              tier: "deep",
              access: "read-only",
              consultation: "request",
            },
          },
        },
      },
      message: "Team orchestration references unknown skill: missing",
    },
    {
      manifest: {
        ...validTeamManifest,
        orchestration: {
          ...validTeamManifest.orchestration,
          roles: {
            ...validTeamManifest.orchestration.roles,
            "./skills/coordinator": {
              tier: "deep",
              access: "read-only",
              consultation: "request",
            },
          },
        },
      },
      message: "Team orchestration coordinator must receive consultations",
    },
    {
      manifest: {
        ...validTeamManifest,
        kind: "workflow",
        coordinator: undefined,
        members: undefined,
      },
      message: "Workflow manifests cannot declare orchestration",
    },
  ];

  for (const invalidCase of invalidCases) {
    expect(() => WorkflowBundleManifestSchema.parse(invalidCase.manifest)).toThrow(
      invalidCase.message,
    );
  }
});
```

- [ ] **Step 3: Run the focused test and confirm the schema rejects the new field semantics**

Run:

```bash
rtk bun test tests/workflow-bundles.test.ts --test-name-pattern "team orchestration|first-class team metadata"
```

Expected: FAIL because the current manifest schema strips `orchestration`, so
the new parsing assertion receives `undefined`.

- [ ] **Step 4: Implement the orchestration schemas**

Add above `WorkflowBundleManifestSchema`:

```ts
const WorkflowOrchestrationAssignmentSchema = z.object({
  tier: z.enum(["deep", "standard", "fast"]),
  access: z.enum(["read-only", "workspace-write"]),
  consultation: z.enum(["receive", "request", "none"]),
});

const WorkflowOrchestrationSchema = z.object({
  roles: z
    .record(z.string().min(1), WorkflowOrchestrationAssignmentSchema)
    .refine((roles) => Object.keys(roles).length > 0, "Team orchestration must declare roles"),
  support: z
    .record(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), WorkflowOrchestrationAssignmentSchema)
    .optional(),
});
```

Add this field to the manifest object:

```ts
orchestration: WorkflowOrchestrationSchema.optional(),
```

Add these checks inside `superRefine`, after `effectiveKind` is defined:

```ts
if (manifest.orchestration && effectiveKind !== "team") {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Workflow manifests cannot declare orchestration",
    path: ["orchestration"],
  });
}

if (manifest.orchestration && effectiveKind === "team") {
  for (const source of Object.keys(manifest.orchestration.roles)) {
    if (!skillSources.has(source)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Team orchestration references unknown skill: ${source}`,
        path: ["orchestration", "roles", source],
      });
    }
  }

  if (
    manifest.coordinator &&
    manifest.orchestration.roles[manifest.coordinator]?.consultation !== "receive"
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Team orchestration coordinator must receive consultations",
      path: ["orchestration", "roles", manifest.coordinator, "consultation"],
    });
  }

  for (const [source, assignment] of Object.entries(manifest.orchestration.roles)) {
    if (source !== manifest.coordinator && assignment.consultation === "receive") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Only the team coordinator can receive consultations: ${source}`,
        path: ["orchestration", "roles", source, "consultation"],
      });
    }
  }

  for (const [source, assignment] of Object.entries(manifest.orchestration.support ?? {})) {
    if (assignment.consultation === "receive") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Only the team coordinator can receive consultations: ${source}`,
        path: ["orchestration", "support", source, "consultation"],
      });
    }
  }
}
```

- [ ] **Step 5: Run focused and full workflow-bundle tests**

Run:

```bash
rtk bun test tests/workflow-bundles.test.ts
```

Expected: PASS with no failures.

- [ ] **Step 6: Commit the manifest contract**

```bash
rtk git add src/runtimes/omniskill/workflow-bundles.ts tests/workflow-bundles.test.ts
rtk git commit -m "feat: validate team orchestration policy"
```

## Task 2: Build the pure tier configuration and native profile compiler

**Files:**

- Create: `src/runtimes/omniskill/orchestration.ts`
- Modify: `src/runtimes/omniskill/index.ts`
- Create: `tests/orchestration.test.ts`

- [ ] **Step 1: Write failing configuration and planning tests**

Create `tests/orchestration.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  DEFAULT_ORCHESTRATION_CONFIG,
  OrchestrationConfigSchema,
  planAgentProfiles,
} from "../src/runtimes/omniskill/orchestration";
import { WorkflowBundleManifestSchema } from "../src/runtimes/omniskill/workflow-bundles";

const manifest = WorkflowBundleManifestSchema.parse({
  schemaVersion: "0.1",
  kind: "team",
  name: "test-team",
  version: "1.0.0",
  description: "Team with orchestration.",
  coordinator: "./skills/coordinator",
  members: ["catalog:cto"],
  orchestration: {
    roles: {
      "./skills/coordinator": {
        tier: "deep",
        access: "read-only",
        consultation: "receive",
      },
      "catalog:cto": {
        tier: "deep",
        access: "read-only",
        consultation: "request",
      },
      "mattpocock:implement": {
        tier: "standard",
        access: "workspace-write",
        consultation: "request",
      },
    },
    support: {
      explorer: {
        tier: "fast",
        access: "read-only",
        consultation: "request",
      },
    },
  },
  skills: [
    { source: "./skills/coordinator", entry: true },
    { source: "catalog:cto" },
    { source: "mattpocock:implement" },
  ],
  steps: [{ id: "route", title: "Route", skill: "./skills/coordinator" }],
});

describe("orchestration configuration", () => {
  test("rejects empty candidates and silent tier downgrades", () => {
    expect(() =>
      OrchestrationConfigSchema.parse({
        ...DEFAULT_ORCHESTRATION_CONFIG,
        tiers: {
          ...DEFAULT_ORCHESTRATION_CONFIG.tiers,
          deep: { ...DEFAULT_ORCHESTRATION_CONFIG.tiers.deep, codex: [] },
        },
      }),
    ).toThrow();
    expect(() =>
      OrchestrationConfigSchema.parse({
        ...DEFAULT_ORCHESTRATION_CONFIG,
        policy: {
          ...DEFAULT_ORCHESTRATION_CONFIG.policy,
          lowerTierFallback: "automatic",
        },
      }),
    ).toThrow();
  });

  test("rejects duplicate candidates", () => {
    expect(() =>
      OrchestrationConfigSchema.parse({
        ...DEFAULT_ORCHESTRATION_CONFIG,
        tiers: {
          ...DEFAULT_ORCHESTRATION_CONFIG.tiers,
          deep: {
            ...DEFAULT_ORCHESTRATION_CONFIG.tiers.deep,
            codex: [
              { model: "gpt-5.6", reasoningEffort: "high" },
              { model: "gpt-5.6", reasoningEffort: "high" },
            ],
          },
        },
      }),
    ).toThrow("Duplicate deep codex orchestration candidate: gpt-5.6/high");
  });

  test("renders deterministic Codex and Claude profiles", () => {
    const profiles = planAgentProfiles({
      manifest,
      config: DEFAULT_ORCHESTRATION_CONFIG,
      homeDir: "/tmp/orchestration-home",
      targets: ["codex", "claude"],
    });

    expect(profiles.map(({ profileId, target, tier }) => ({ profileId, target, tier }))).toEqual([
      { profileId: "omniskills-test-team-coordinator", target: "claude", tier: "deep" },
      { profileId: "omniskills-test-team-coordinator", target: "codex", tier: "deep" },
      { profileId: "omniskills-test-team-cto", target: "claude", tier: "deep" },
      { profileId: "omniskills-test-team-cto", target: "codex", tier: "deep" },
      { profileId: "omniskills-test-team-explorer", target: "claude", tier: "fast" },
      { profileId: "omniskills-test-team-explorer", target: "codex", tier: "fast" },
      { profileId: "omniskills-test-team-implement", target: "claude", tier: "standard" },
      { profileId: "omniskills-test-team-implement", target: "codex", tier: "standard" },
    ]);
    expect(profiles.find(({ target }) => target === "codex")?.content).toContain(
      'model = "gpt-5.6"',
    );
    expect(profiles.find(({ target }) => target === "claude")?.content).toContain(
      "model: opus",
    );
    expect(profiles.find(({ source }) => source === "catalog:cto")?.content).toContain(
      "Consult at most 2 time(s)",
    );
    expect(profiles.find(({ source }) => source === "catalog:cto")?.content).toContain(
      "Reject a repeated consultation without new evidence",
    );
    expect(profiles.find(({ source }) => source === "catalog:cto")?.content).toContain(
      "Never expand scope, bypass an approval gate, change permissions, or downgrade a tier",
    );
    expect(profiles.every(({ contentHash }) => /^sha256:[a-f0-9]{64}$/.test(contentHash))).toBe(
      true,
    );
    expect(profiles.find(({ target }) => target === "codex")?.destination).toBe(
      join("/tmp/orchestration-home", ".codex", "agents", "omniskills-test-team-coordinator.toml"),
    );
  });

  test("renders ordered same-tier fallback profiles", () => {
    const config = OrchestrationConfigSchema.parse({
      ...DEFAULT_ORCHESTRATION_CONFIG,
      tiers: {
        ...DEFAULT_ORCHESTRATION_CONFIG.tiers,
        deep: {
          ...DEFAULT_ORCHESTRATION_CONFIG.tiers.deep,
          codex: [
            { model: "gpt-5.6", reasoningEffort: "high" },
            { model: "gpt-5.4", reasoningEffort: "high" },
          ],
        },
      },
    });
    const profiles = planAgentProfiles({
      manifest,
      config,
      homeDir: "/tmp/orchestration-home",
      targets: ["codex"],
    });
    expect(
      profiles
        .filter(({ source }) => source === "catalog:cto")
        .map(({ profileId, model, candidateIndex }) => ({ profileId, model, candidateIndex })),
    ).toEqual([
      { profileId: "omniskills-test-team-cto", model: "gpt-5.6", candidateIndex: 0 },
      {
        profileId: "omniskills-test-team-cto-fallback-2",
        model: "gpt-5.4",
        candidateIndex: 1,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run the new test and verify the module is missing**

```bash
rtk bun test tests/orchestration.test.ts
```

Expected: FAIL with `Cannot find module '../src/runtimes/omniskill/orchestration'`.

- [ ] **Step 3: Implement the configuration schemas and defaults**

Create `src/runtimes/omniskill/orchestration.ts` with these public definitions:

```ts
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { z } from "zod";
import type { WorkflowBundleManifest } from "./workflow-bundles";

export const orchestrationConfigFileName = "orchestration.json";
export const orchestrationTiers = ["deep", "standard", "fast"] as const;
export type OrchestrationTier = (typeof orchestrationTiers)[number];
export type AgentProfileTarget = "codex" | "claude";

const CodexCandidateSchema = z.object({
  model: z.string().min(1),
  reasoningEffort: z.enum(["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"]),
});
const ClaudeCandidateSchema = z.object({
  model: z.string().min(1),
  effort: z.enum(["low", "medium", "high", "xhigh", "max"]),
});
const TierCandidatesSchema = z.object({
  codex: z.array(CodexCandidateSchema).min(1),
  claude: z.array(ClaudeCandidateSchema).min(1),
});

export const OrchestrationConfigSchema = z
  .object({
    schemaVersion: z.literal("0.1"),
    tiers: z.object({
      deep: TierCandidatesSchema,
      standard: TierCandidatesSchema,
      fast: TierCandidatesSchema,
    }),
    limits: z.object({
      retryPerCandidate: z.number().int().min(1).max(3),
      reassignmentPerWorkItem: z.number().int().min(1).max(3),
      consultationsPerAgent: z.number().int().min(1).max(5),
    }),
    policy: z.object({
      sameTierFallback: z.literal("automatic_disclosed"),
      lowerTierFallback: z.literal("human_approval"),
    }),
  })
  .superRefine((config, context) => {
    for (const tier of orchestrationTiers) {
      for (const target of ["codex", "claude"] as const) {
        const seen = new Set<string>();
        for (const [index, candidate] of config.tiers[tier][target].entries()) {
          const effort =
            "reasoningEffort" in candidate ? candidate.reasoningEffort : candidate.effort;
          const identity = `${candidate.model}/${effort}`;
          if (seen.has(identity)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate ${tier} ${target} orchestration candidate: ${identity}`,
              path: ["tiers", tier, target, index],
            });
          }
          seen.add(identity);
        }
      }
    }
  });

export type OrchestrationConfig = z.infer<typeof OrchestrationConfigSchema>;

export const DEFAULT_ORCHESTRATION_CONFIG: OrchestrationConfig = {
  schemaVersion: "0.1",
  tiers: {
    deep: {
      codex: [{ model: "gpt-5.6", reasoningEffort: "high" }],
      claude: [{ model: "opus", effort: "high" }],
    },
    standard: {
      codex: [{ model: "gpt-5.6", reasoningEffort: "medium" }],
      claude: [{ model: "sonnet", effort: "medium" }],
    },
    fast: {
      codex: [{ model: "gpt-5.6-terra", reasoningEffort: "low" }],
      claude: [{ model: "haiku", effort: "low" }],
    },
  },
  limits: {
    retryPerCandidate: 1,
    reassignmentPerWorkItem: 1,
    consultationsPerAgent: 2,
  },
  policy: {
    sameTierFallback: "automatic_disclosed",
    lowerTierFallback: "human_approval",
  },
};
```

- [ ] **Step 4: Implement deterministic profile planning and rendering**

Append the following interfaces and functions to the same file:

```ts
export interface PlannedAgentProfile {
  source: string;
  profileId: string;
  target: AgentProfileTarget;
  tier: OrchestrationTier;
  model: string;
  effort: string;
  access: "read-only" | "workspace-write";
  candidateIndex: number;
  destination: string;
  content: string;
  contentHash: string;
}

function sourceId(source: string): string {
  if (source.startsWith("catalog:")) return source.slice("catalog:".length);
  if (source.includes(":")) return source.slice(source.indexOf(":") + 1);
  return basename(source);
}

function instructions(input: {
  team: string;
  source: string;
  tier: OrchestrationTier;
  consultation: "receive" | "request" | "none";
  limits: OrchestrationConfig["limits"];
}): string {
  return [
    `You are the ${input.source} agent for the ${input.team} Omniskills team.`,
    `Capability tier: ${input.tier}. Stay within the assigned runtime vendor.`,
    `Retry each model candidate at most ${input.limits.retryPerCandidate} time(s).`,
    `Reassign a work item at most ${input.limits.reassignmentPerWorkItem} time(s).`,
    `Consult at most ${input.limits.consultationsPerAgent} time(s), only for ambiguity, requirement_conflict, elevated_risk, or failed_verification.`,
    "A consultation must include trigger, current_task, evidence, decision_needed, and recommendation.",
    "Reject a repeated consultation without new evidence and escalate when the consultation limit is exhausted.",
    "Use an ordered same-tier fallback only after an observed failure, and disclose the failed candidate and reason.",
    "Never expand scope, bypass an approval gate, change permissions, or downgrade a tier without human approval.",
    `Consultation mode: ${input.consultation}.`,
  ].join("\n");
}

function renderCodex(input: {
  profileId: string;
  model: string;
  effort: string;
  access: "read-only" | "workspace-write";
  developerInstructions: string;
}): string {
  return [
    `name = ${JSON.stringify(input.profileId)}`,
    `description = ${JSON.stringify(`Omniskills managed agent ${input.profileId}`)}`,
    `model = ${JSON.stringify(input.model)}`,
    `model_reasoning_effort = ${JSON.stringify(input.effort)}`,
    `sandbox_mode = ${JSON.stringify(input.access)}`,
    `developer_instructions = ${JSON.stringify(input.developerInstructions)}`,
    "",
  ].join("\n");
}

function renderClaude(input: {
  profileId: string;
  model: string;
  effort: string;
  access: "read-only" | "workspace-write";
  developerInstructions: string;
}): string {
  const tools =
    input.access === "workspace-write"
      ? "Read, Glob, Grep, Bash, Write, Edit, SendMessage"
      : "Read, Glob, Grep, Bash, SendMessage";
  return [
    "---",
    `name: ${input.profileId}`,
    `description: Omniskills managed agent ${input.profileId}`,
    `model: ${input.model}`,
    `effort: ${input.effort}`,
    `tools: ${tools}`,
    "disallowedTools: Agent",
    "---",
    "",
    input.developerInstructions,
    "",
  ].join("\n");
}

export function planAgentProfiles(input: {
  manifest: WorkflowBundleManifest;
  config: OrchestrationConfig;
  homeDir: string;
  targets: AgentProfileTarget[];
}): PlannedAgentProfile[] {
  if (!input.manifest.orchestration) return [];
  const assignments = [
    ...Object.entries(input.manifest.orchestration.roles).map(([source, assignment]) => ({
      source,
      assignment,
    })),
    ...Object.entries(input.manifest.orchestration.support ?? {}).map(([source, assignment]) => ({
      source,
      assignment,
    })),
  ];
  const profiles: PlannedAgentProfile[] = [];

  for (const { source, assignment } of assignments) {
    for (const target of input.targets) {
      const candidates = input.config.tiers[assignment.tier][target];
      for (const [candidateIndex, candidate] of candidates.entries()) {
        const baseId = `omniskills-${input.manifest.name}-${sourceId(source)}`;
        const profileId = candidateIndex === 0 ? baseId : `${baseId}-fallback-${candidateIndex + 1}`;
        const developerInstructions = instructions({
          team: input.manifest.name,
          source,
          tier: assignment.tier,
          consultation: assignment.consultation,
          limits: input.config.limits,
        });
        const model = candidate.model;
        const effort = "reasoningEffort" in candidate ? candidate.reasoningEffort : candidate.effort;
        const content =
          target === "codex"
            ? renderCodex({ profileId, model, effort, access: assignment.access, developerInstructions })
            : renderClaude({ profileId, model, effort, access: assignment.access, developerInstructions });
        const extension = target === "codex" ? "toml" : "md";
        profiles.push({
          source,
          profileId,
          target,
          tier: assignment.tier,
          model,
          effort,
          access: assignment.access,
          candidateIndex,
          destination: join(input.homeDir, `.${target}`, "agents", `${profileId}.${extension}`),
          content,
          contentHash: `sha256:${createHash("sha256").update(content).digest("hex")}`,
        });
      }
    }
  }

  return profiles.sort((left, right) =>
    `${left.profileId}:${left.target}`.localeCompare(`${right.profileId}:${right.target}`),
  );
}
```

- [ ] **Step 5: Export the runtime and run focused tests**

Append to `src/runtimes/omniskill/index.ts`:

```ts
export * from "./orchestration";
```

Run:

```bash
rtk bun test tests/orchestration.test.ts tests/workflow-bundles.test.ts
rtk bun run typecheck
```

Expected: both commands PASS.

- [ ] **Step 6: Commit the pure compiler**

```bash
rtk git add src/runtimes/omniskill/orchestration.ts src/runtimes/omniskill/index.ts tests/orchestration.test.ts
rtk git commit -m "feat: compile orchestration agent profiles"
```

## Task 3: Add safe global configuration and profile lifecycle writes

**Files:**

- Create: `src/plugins/agent-profile-installer.ts`
- Modify: `src/plugins/index.ts`
- Create: `tests/agent-profile-installer.test.ts`

- [ ] **Step 1: Write failing temporary-home lifecycle tests**

Create `tests/agent-profile-installer.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  executeAgentProfilePlan,
  loadOrchestrationConfigPlan,
  preflightAgentProfiles,
} from "../src/plugins/agent-profile-installer";
import {
  DEFAULT_ORCHESTRATION_CONFIG,
  type PlannedAgentProfile,
} from "../src/runtimes/omniskill/orchestration";

function profile(homeDir: string): PlannedAgentProfile {
  const content = 'name = "omniskills-test-team-cto"\n';
  return {
    source: "catalog:cto",
    profileId: "omniskills-test-team-cto",
    target: "codex",
    tier: "deep",
    model: "gpt-5.6",
    effort: "high",
    access: "read-only",
    candidateIndex: 0,
    destination: join(homeDir, ".codex", "agents", "omniskills-test-team-cto.toml"),
    content,
    contentHash: "sha256:dc1e7574859a9c5ffaf59e58344aabf284394fcb97d8d5775e5af5a8390eb285",
  };
}

describe("agent profile installer", () => {
  test("plans a missing global config without writing it", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "orchestration-config-"));
    try {
      const plan = await loadOrchestrationConfigPlan({ homeDir });
      expect(plan.status).toBe("create");
      expect(plan.config).toEqual(DEFAULT_ORCHESTRATION_CONFIG);
      await expect(readFile(plan.path, "utf8")).rejects.toThrow();
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("creates, detects unchanged, and refuses drifted profiles", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "orchestration-profile-"));
    const planned = profile(homeDir);
    try {
      const first = await preflightAgentProfiles({ profiles: [planned], previousArtifacts: [] });
      expect(first.map(({ status }) => status)).toEqual(["create"]);
      await executeAgentProfilePlan({ profiles: first });

      const unchanged = await preflightAgentProfiles({
        profiles: [planned],
        previousArtifacts: [
          {
            kind: "agent_profile",
            source: planned.source,
            profileId: planned.profileId,
            agent: planned.target,
            status: "installed",
            path: planned.destination,
            contentHash: planned.contentHash,
          },
        ],
      });
      expect(unchanged.map(({ status }) => status)).toEqual(["unchanged"]);

      const updatedContent = 'name = "omniskills-test-team-cto-v2"\n';
      const updated = {
        ...planned,
        content: updatedContent,
        contentHash: `sha256:${createHash("sha256").update(updatedContent).digest("hex")}`,
      };
      const update = await preflightAgentProfiles({
        profiles: [updated],
        previousArtifacts: unchanged.map(({ artifact }) => artifact),
      });
      expect(update.map(({ status }) => status)).toEqual(["update"]);

      await writeFile(planned.destination, "user edit\n");
      const conflict = await preflightAgentProfiles({
        profiles: [planned],
        previousArtifacts: unchanged.map(({ artifact }) => artifact),
      });
      expect(conflict.map(({ status }) => status)).toEqual(["conflict"]);

      const forced = await preflightAgentProfiles({
        profiles: [planned],
        previousArtifacts: unchanged.map(({ artifact }) => artifact),
        force: true,
      });
      expect(forced.map(({ status }) => status)).toEqual(["update"]);
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("refuses an unowned foreign profile unless force is explicit", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "orchestration-foreign-"));
    const planned = profile(homeDir);
    try {
      const initial = await preflightAgentProfiles({
        profiles: [planned],
        previousArtifacts: [],
      });
      await executeAgentProfilePlan({ profiles: initial });
      const conflict = await preflightAgentProfiles({
        profiles: [planned],
        previousArtifacts: [],
      });
      expect(conflict.map(({ status }) => status)).toEqual(["conflict"]);

      const forced = await preflightAgentProfiles({
        profiles: [planned],
        previousArtifacts: [],
        force: true,
      });
      expect(forced.map(({ status }) => status)).toEqual(["update"]);
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });

  test("rolls back earlier profile writes when a later write fails", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "orchestration-rollback-"));
    const firstProfile = profile(homeDir);
    const blockedParent = join(homeDir, "blocked-parent");
    const blockedProfile: PlannedAgentProfile = {
      ...firstProfile,
      source: "explorer",
      profileId: "omniskills-test-team-explorer",
      destination: join(blockedParent, "omniskills-test-team-explorer.toml"),
    };
    try {
      await writeFile(blockedParent, "not a directory\n");
      const writes = await preflightAgentProfiles({
        profiles: [firstProfile, blockedProfile],
        previousArtifacts: [],
      });
      await expect(executeAgentProfilePlan({ profiles: writes })).rejects.toThrow();
      await expect(readFile(firstProfile.destination, "utf8")).rejects.toThrow();
    } finally {
      await rm(homeDir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run the test and verify the installer module is missing**

```bash
rtk bun test tests/agent-profile-installer.test.ts
```

Expected: FAIL with `Cannot find module '../src/plugins/agent-profile-installer'`.

- [ ] **Step 3: Implement configuration planning and profile preflight**

Create `src/plugins/agent-profile-installer.ts`:

```ts
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  DEFAULT_ORCHESTRATION_CONFIG,
  OrchestrationConfigSchema,
  orchestrationConfigFileName,
  type OrchestrationConfig,
  type PlannedAgentProfile,
} from "../runtimes/omniskill/orchestration";

export type AgentProfileInstallStatus = "create" | "unchanged" | "update" | "conflict";

export interface AgentProfileArtifact {
  kind: "agent_profile";
  source: string;
  profileId: string;
  agent: "codex" | "claude";
  status: "installed" | "updated" | "unchanged";
  path: string;
  contentHash: string;
}

export interface PlannedAgentProfileWrite {
  profile: PlannedAgentProfile;
  status: AgentProfileInstallStatus;
  artifact: AgentProfileArtifact;
}

function hash(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

export async function loadOrchestrationConfigPlan(input: { homeDir: string }): Promise<{
  path: string;
  status: "create" | "unchanged";
  config: OrchestrationConfig;
  content: string;
}> {
  const path = join(input.homeDir, ".omniskills", orchestrationConfigFileName);
  if (!existsSync(path)) {
    const content = `${JSON.stringify(DEFAULT_ORCHESTRATION_CONFIG, null, 2)}\n`;
    return { path, status: "create", config: DEFAULT_ORCHESTRATION_CONFIG, content };
  }
  const content = await readFile(path, "utf8");
  return {
    path,
    status: "unchanged",
    config: OrchestrationConfigSchema.parse(JSON.parse(content)),
    content,
  };
}

export async function preflightAgentProfiles(input: {
  profiles: PlannedAgentProfile[];
  previousArtifacts: AgentProfileArtifact[];
  force?: boolean;
}): Promise<PlannedAgentProfileWrite[]> {
  const previousByPath = new Map(input.previousArtifacts.map((artifact) => [artifact.path, artifact]));
  const writes: PlannedAgentProfileWrite[] = [];
  for (const profile of input.profiles) {
    const previous = previousByPath.get(profile.destination);
    const exists = existsSync(profile.destination);
    let status: AgentProfileInstallStatus;
    if (!exists) {
      status = "create";
    } else {
      const actualHash = hash(await readFile(profile.destination, "utf8"));
      if (!previous || actualHash !== previous.contentHash) {
        status = input.force ? "update" : "conflict";
      } else {
        status = actualHash === profile.contentHash ? "unchanged" : "update";
      }
    }
    writes.push({
      profile,
      status,
      artifact: {
        kind: "agent_profile",
        source: profile.source,
        profileId: profile.profileId,
        agent: profile.target,
        status: status === "update" ? "updated" : status === "unchanged" ? "unchanged" : "installed",
        path: profile.destination,
        contentHash: profile.contentHash,
      },
    });
  }
  return writes;
}
```

- [ ] **Step 4: Implement atomic batch execution with rollback**

Append:

```ts
export async function executeAgentProfilePlan(input: {
  profiles: PlannedAgentProfileWrite[];
  config?: { path: string; status: "create" | "unchanged"; content: string };
}): Promise<AgentProfileArtifact[]> {
  const conflict = input.profiles.find(({ status }) => status === "conflict");
  if (conflict) {
    throw new Error(`Agent profile conflict: ${conflict.profile.destination}`);
  }

  const changed: Array<{ path: string; previous: string | null }> = [];
  try {
    for (const planned of input.profiles) {
      if (planned.status === "unchanged") continue;
      const destination = planned.profile.destination;
      const previous = existsSync(destination) ? await readFile(destination, "utf8") : null;
      await mkdir(dirname(destination), { recursive: true });
      const temporary = `${destination}.omniskills-tmp`;
      await writeFile(temporary, planned.profile.content);
      await rename(temporary, destination);
      changed.push({ path: destination, previous });
    }

    if (input.config?.status === "create") {
      await mkdir(dirname(input.config.path), { recursive: true });
      const temporary = `${input.config.path}.omniskills-tmp`;
      await writeFile(temporary, input.config.content);
      await rename(temporary, input.config.path);
      changed.push({ path: input.config.path, previous: null });
    }
  } catch (error) {
    for (const entry of changed.reverse()) {
      if (entry.previous === null) {
        await rm(entry.path, { force: true });
      } else {
        await writeFile(entry.path, entry.previous);
      }
    }
    throw error;
  }

  return input.profiles.map(({ artifact }) => artifact);
}
```

- [ ] **Step 5: Export the plugin and run focused verification**

Append to `src/plugins/index.ts`:

```ts
export * from "./agent-profile-installer";
```

Run:

```bash
rtk bun test tests/agent-profile-installer.test.ts tests/orchestration.test.ts
rtk bun run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit the profile lifecycle**

```bash
rtk git add src/plugins/agent-profile-installer.ts src/plugins/index.ts tests/agent-profile-installer.test.ts
rtk git commit -m "feat: manage native agent profiles"
```

## Task 4: Record profile ownership and preserve drift during removal

**Files:**

- Modify: `src/runtimes/omniskill/workflow-bundles.ts:378-435`
- Modify: `src/runtimes/omniskill/workflow-bundles.ts:600-713`
- Modify: `src/runtimes/omniskill/workflow-bundles.ts:1347-1405`
- Test: `tests/workflow-bundles.test.ts:2110-2280`

- [ ] **Step 1: Add failing profile artifact storage and drift-removal tests**

Add to `tests/workflow-bundles.test.ts`:

```ts
test("stores managed profile artifacts and preserves drift during removal", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "workflow-profile-artifact-"));
  const bundle = await loadWorkflowBundle("examples/workflows/release-review");
  const profilePath = join(rootDir, ".codex", "agents", "omniskills-release-review.toml");
  const installedContent = 'name = "omniskills-release-review"\n';
  const installedHash = `sha256:${createHash("sha256").update(installedContent).digest("hex")}`;

  try {
    await mkdir(join(rootDir, ".codex", "agents"), { recursive: true });
    await writeFile(profilePath, installedContent);
    const install = await installWorkflowBundle({
      rootDir,
      bundle,
      installArtifacts: [
        {
          kind: "agent_profile",
          source: "./skills/release-risk-review",
          profileId: "omniskills-release-review",
          agent: "codex",
          status: "installed",
          path: profilePath,
          contentHash: installedHash,
        },
      ],
    });
    const installed = JSON.parse(await readFile(install.path, "utf8"));
    expect(installed.installArtifacts[0].kind).toBe("agent_profile");

    const cleanPlan = await createWorkflowRemovalPlan({
      rootDir,
      homeDir: rootDir,
      workflowName: bundle.manifest.name,
    });
    expect(cleanPlan.artifactsToRemove.map(({ path }) => path)).toEqual([profilePath]);

    await writeFile(profilePath, "user-modified\n");
    const plan = await createWorkflowRemovalPlan({
      rootDir,
      homeDir: rootDir,
      workflowName: bundle.manifest.name,
    });
    expect(plan.artifactsToRemove).toEqual([]);
    expect(plan.skippedArtifacts).toEqual([
      { source: "./skills/release-risk-review", reason: `Modified agent profile kept: ${profilePath}` },
    ]);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the focused test and verify the artifact type is unsupported**

```bash
rtk bun test tests/workflow-bundles.test.ts --test-name-pattern "managed profile artifacts"
```

Expected: FAIL at TypeScript/runtime flattening because profile artifacts do not
have the existing skill artifact `paths` field.

- [ ] **Step 3: Add a discriminated profile artifact to installed records**

Replace the install artifact definitions with:

```ts
export interface WorkflowInstallSkillArtifact {
  kind?: "skill";
  source: string;
  skillName: string;
  agent: string;
  status: string;
  paths: string[];
}

export interface WorkflowInstallAgentProfileArtifact {
  kind: "agent_profile";
  source: string;
  profileId: string;
  agent: "codex" | "claude";
  status: string;
  path: string;
  contentHash: string;
}

export type WorkflowInstallArtifact =
  | WorkflowInstallSkillArtifact
  | WorkflowInstallAgentProfileArtifact;
```

Change these signatures and properties from
`WorkflowInstallSkillArtifact[]` to `WorkflowInstallArtifact[]`:

```ts
export interface InstalledWorkflowBundle extends WorkflowBundleManifest {
  source: WorkflowBundleSource;
  installArtifacts?: WorkflowInstallArtifact[];
}

export async function installWorkflowBundle(input: {
  rootDir: string;
  bundle: WorkflowBundle;
  installArtifacts?: WorkflowInstallArtifact[];
}): Promise<WorkflowInstallResult>;
```

Change `createInstalledWorkflowBundle` to accept `WorkflowInstallArtifact[]`.

- [ ] **Step 4: Implement profile flattening and drift checks**

Add helpers near `flattenInstallArtifacts`:

```ts
function isAgentProfileArtifact(
  artifact: WorkflowInstallArtifact,
): artifact is WorkflowInstallAgentProfileArtifact {
  return artifact.kind === "agent_profile";
}

function artifactPaths(artifact: WorkflowInstallArtifact): string[] {
  return isAgentProfileArtifact(artifact) ? [artifact.path] : artifact.paths;
}

function flattenInstallArtifacts(
  artifacts: WorkflowInstallArtifact[],
): WorkflowRemovalArtifact[] {
  return artifacts.flatMap((artifact) =>
    isRemovableInstallStatus(artifact.status)
      ? artifactPaths(artifact).map((path) => ({
          source: artifact.source,
          skillName: isAgentProfileArtifact(artifact) ? artifact.profileId : artifact.skillName,
          agent: artifact.agent,
          status: artifact.status,
          path,
        }))
      : [],
  );
}

async function profileMatchesInstalledHash(
  artifact: WorkflowInstallAgentProfileArtifact,
): Promise<boolean> {
  try {
    const content = await readFile(artifact.path, "utf8");
    return `sha256:${createHash("sha256").update(content).digest("hex")}` === artifact.contentHash;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw error;
  }
}
```

In `createWorkflowRemovalPlan`, replace candidate construction with this block
so drifted profiles never reach `artifactsToRemove`:

```ts
const driftedProfilePaths = new Set<string>();
for (const artifact of installed.workflow.installArtifacts ?? []) {
  if (isAgentProfileArtifact(artifact) && !(await profileMatchesInstalledHash(artifact))) {
    driftedProfilePaths.add(artifact.path);
    skippedArtifacts.push({
      source: artifact.source,
      reason: `Modified agent profile kept: ${artifact.path}`,
    });
  }
}

const candidates = legacy
  ? inferLegacyRemovalArtifacts(installed.workflow, input.homeDir, skippedArtifacts)
  : flattenInstallArtifacts(installed.workflow.installArtifacts ?? []).filter(
      (artifact) => !driftedProfilePaths.has(artifact.path),
    );
```

Replace the inner loop in `getArtifactPathOwners` with:

```ts
for (const artifact of workflow.installArtifacts ?? []) {
  for (const path of artifactPaths(artifact)) {
    const existing = owners.get(path) ?? [];
    existing.push(workflow.name);
    owners.set(path, existing);
  }
}
```

- [ ] **Step 5: Run workflow and command regression tests**

```bash
rtk bun test tests/workflow-bundles.test.ts tests/omniskill.test.ts
rtk bun run typecheck
```

Expected: PASS, including legacy records with no `kind` field.

- [ ] **Step 6: Commit ownership-aware records**

```bash
rtk git add src/runtimes/omniskill/workflow-bundles.ts tests/workflow-bundles.test.ts
rtk git commit -m "feat: track managed agent profile ownership"
```

## Task 5: Integrate profile preflight and zero-write install dry-run

**Files:**

- Modify: `src/omniskill.ts:1-165`
- Modify: `src/omniskill.ts:320-470`
- Modify: `src/omniskill.ts:470-520`
- Test: `tests/omniskill.test.ts`

- [ ] **Step 1: Extend the command test fixture for orchestration teams**

Add `orchestration?: boolean` to the options for `writeGitWorkflowFixtureAt`.
When `options.team && options.orchestration`, include:

```ts
orchestration: {
  roles: {
    "./skills/git-entry": {
      tier: "deep",
      access: "read-only",
      consultation: "receive",
    },
    [options.localTeamMember ? "./skills/git-extra" : "./member-workflow"]: {
      tier: "standard",
      access: "workspace-write",
      consultation: "request",
    },
  },
},
```

- [ ] **Step 2: Add a failing zero-write dry-run test**

Add to `tests/omniskill.test.ts`:

```ts
test("install dry-run prints native profiles without installing skills or writing files", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "omniskill-dry-run-root-"));
  const homeDir = await mkdtemp(join(tmpdir(), "omniskill-dry-run-home-"));
  const bundleDir = join(rootDir, "git-team");
  const logs: string[] = [];
  const originalLog = console.log;
  let installCalls = 0;
  const program = new Command();

  console.log = (...values: unknown[]) => logs.push(values.join(" "));
  try {
    await writeGitWorkflowFixtureAt(bundleDir, {
      team: true,
      localTeamMember: true,
      orchestration: true,
    });
    configureOmniskillCommand(program, {
      rootDir,
      installSkill: async () => {
        installCalls += 1;
        throw new Error("dry-run must not install skills");
      },
      printSkillInstallResult: () => {},
    });

    await program.parseAsync(
      ["install", bundleDir, "--home", homeDir, "--agents", "codex,claude", "--dry-run"],
      { from: "user" },
    );

    expect(installCalls).toBe(0);
    expect(logs.join("\n")).toContain("Agent profiles:");
    expect(logs.join("\n")).toContain("omniskills-git-team-git-entry");
    await expect(readFile(join(homeDir, ".omniskills", "orchestration.json"), "utf8")).rejects.toThrow();
    await expect(readFile(join(homeDir, ".omniskills", "workflows", "git-team.json"), "utf8")).rejects.toThrow();
  } finally {
    console.log = originalLog;
    await rm(rootDir, { recursive: true, force: true });
    await rm(homeDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Add a failing actual-install artifact test**

Add this complete test beside the dry-run test:

```ts
test("install persists native profiles and their managed artifacts", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "omniskill-profile-root-"));
  const homeDir = await mkdtemp(join(tmpdir(), "omniskill-profile-home-"));
  const bundleDir = join(rootDir, "git-team");
  const program = new Command();

  try {
    await writeGitWorkflowFixtureAt(bundleDir, {
      team: true,
      localTeamMember: true,
      orchestration: true,
    });
    configureOmniskillCommand(program, {
      rootDir,
      installPrompt: { confirmInstall: async () => true },
      installSkill: async (input) => {
        const skillName = input.source.endsWith("git-extra") ? "git-extra" : "git-entry";
        return {
          skillInstall: fakeSkillInstallResult({
            source: input.source,
            skillName,
            destination: join(homeDir, ".agents", "skills", skillName),
          }),
        };
      },
      printSkillInstallResult: () => {},
    });

    await program.parseAsync(
      ["install", bundleDir, "--home", homeDir, "--agents", "codex,claude"],
      { from: "user" },
    );

    const installed = JSON.parse(
      await readFile(join(homeDir, ".omniskills", "workflows", "git-team.json"), "utf8"),
    );
    expect(installed.installArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "agent_profile",
          profileId: "omniskills-git-team-git-entry",
          agent: "codex",
        }),
        expect.objectContaining({
          kind: "agent_profile",
          profileId: "omniskills-git-team-git-entry",
          agent: "claude",
        }),
      ]),
    );
    expect(
      await readFile(join(homeDir, ".omniskills", "orchestration.json"), "utf8"),
    ).toContain('"schemaVersion": "0.1"');
    await expect(
      readFile(
        join(homeDir, ".codex", "agents", "omniskills-git-team-git-entry.toml"),
        "utf8",
      ),
    ).resolves.toContain('model = "gpt-5.6"');
    await expect(
      readFile(
        join(homeDir, ".claude", "agents", "omniskills-git-team-git-entry.md"),
        "utf8",
      ),
    ).resolves.toContain("model: opus");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
    await rm(homeDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 4: Run the tests and verify `--dry-run` is unknown**

```bash
rtk bun test tests/omniskill.test.ts --test-name-pattern "install dry-run|actual-install artifact"
```

Expected: FAIL because the install command does not define `--dry-run` and does
not call the profile compiler.

- [ ] **Step 5: Add install options and target filtering**

Import the new APIs and union artifact type:

```ts
import {
  executeAgentProfilePlan,
  loadOrchestrationConfigPlan,
  preflightAgentProfiles,
  type AgentProfileArtifact,
} from "./plugins";
import {
  planAgentProfiles,
  type AgentProfileTarget,
  type WorkflowInstallArtifact,
} from "./runtimes/omniskill";
```

Change the command options:

```ts
interface OmniskillInstallCommandOptions {
  dir?: string;
  agents: string;
  home: string;
  dryRun: boolean;
  force: boolean;
}
```

Add these Commander options:

```ts
.option("--dry-run", "print the complete install plan without writing files", false)
.option("--force", "replace drifted managed agent profiles", false)
```

Add this helper:

```ts
function orchestrationTargets(
  agents: ReturnType<typeof parseSkillInstallAgents>,
): AgentProfileTarget[] {
  return agents.filter((agent): agent is AgentProfileTarget => agent === "codex" || agent === "claude");
}
```

- [ ] **Step 6: Preflight profiles before prompting or installing skills**

After the dependency plan is prepared, add:

```ts
const configPlan = bundle.manifest.orchestration
  ? await loadOrchestrationConfigPlan({ homeDir })
  : undefined;
const plannedProfiles = configPlan
  ? planAgentProfiles({
      manifest: bundle.manifest,
      config: configPlan.config,
      homeDir,
      targets: orchestrationTargets(installAgents),
    })
  : [];
const installedWorkflow = (await listInstalledWorkflowBundles({ rootDir: targetDir })).find(
  (workflow) => workflow.name === bundle.manifest.name,
);
const previousProfiles = (installedWorkflow?.installArtifacts ?? []).filter(
  (artifact): artifact is AgentProfileArtifact => artifact.kind === "agent_profile",
);
const profilePlan = await preflightAgentProfiles({
  profiles: plannedProfiles,
  previousArtifacts: previousProfiles,
  force: commandOptions.force,
});

printOmniskillInstallPlan({
  workflowName: bundle.manifest.name,
  workflowVersion: bundle.manifest.version,
  skills: skillPlans,
  targetDir,
  homeDir,
  configPlan,
  profilePlan,
});

if (profilePlan.some(({ status }) => status === "conflict")) {
  throw new Error("Omniskills install blocked by agent profile conflicts");
}
if (commandOptions.dryRun) return;
```

Extend `printOmniskillInstallPlan` to print:

```ts
function printOmniskillInstallPlan(input: {
  workflowName: string;
  workflowVersion: string;
  skills: OmniskillInstallSkillPlan[];
  targetDir: string;
  homeDir: string;
  configPlan?: Awaited<ReturnType<typeof loadOrchestrationConfigPlan>>;
  profilePlan: Awaited<ReturnType<typeof preflightAgentProfiles>>;
}): void {
  console.log(success(`Omniskills install plan: ${input.workflowName}@${input.workflowVersion}`));
  console.log(keyValue("Workflow records", input.targetDir));
  console.log(keyValue("Skill home", input.homeDir));
  console.log("Skills to install:");
  for (const skill of input.skills) {
    console.log(`- ${formatInstallSkillPlan(skill)}`);
  }
console.log("Agent profiles:");
if (input.profilePlan.length === 0) console.log("- none");
for (const planned of input.profilePlan) {
  console.log(
    `- ${planned.status}: ${planned.profile.profileId} (${planned.profile.target}/${planned.profile.tier}/${planned.profile.model}/${planned.profile.effort}) -> ${planned.profile.destination}`,
  );
}
if (input.configPlan) {
  console.log(
    keyValue("Orchestration config", `${input.configPlan.status}: ${input.configPlan.path}`),
  );
}
}
```

- [ ] **Step 7: Install profiles and persist their artifacts**

Change the local artifact array to the union:

```ts
const installArtifacts: WorkflowInstallArtifact[] = [];
```

After all skill dependencies succeed and before `installWorkflowBundle`, add:

```ts
if (configPlan) {
  const profileArtifacts = await executeAgentProfilePlan({
    profiles: profilePlan,
    config: configPlan,
  });
  installArtifacts.push(...profileArtifacts);
}
```

Keep `installWorkflowBundle` after that call so the workflow record is written
only when both phases succeed.

- [ ] **Step 8: Run command, runtime, and type verification**

```bash
rtk bun test tests/omniskill.test.ts tests/agent-profile-installer.test.ts tests/orchestration.test.ts tests/workflow-bundles.test.ts
rtk bun run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit CLI integration**

```bash
rtk git add src/omniskill.ts tests/omniskill.test.ts
rtk git commit -m "feat: install orchestration profiles with dry run"
```

## Task 6: Adopt orchestration in `startup-team`

**Files:**

- Modify: `examples/teams/startup-team/workflow.json`
- Modify: `examples/teams/startup-team/skills/startup-goal/SKILL.md`
- Modify: `examples/teams/startup-team/README.md`
- Modify: `docs/architecture.md`
- Test: `tests/workflow-bundles.test.ts:1390-1430`
- Generate: `examples/teams/startup-team/workflow.lock.json`

- [ ] **Step 1: Add a failing public-bundle contract test**

Extend the existing startup-team assertions in
`tests/workflow-bundles.test.ts`:

```ts
expect(startupTeam.manifest.orchestration).toEqual({
  roles: {
    "./skills/startup-goal": {
      tier: "deep",
      access: "read-only",
      consultation: "receive",
    },
    "catalog:ceo": { tier: "deep", access: "read-only", consultation: "request" },
    "catalog:cto": { tier: "deep", access: "read-only", consultation: "request" },
    "catalog:product-manager": {
      tier: "deep",
      access: "read-only",
      consultation: "request",
    },
    "catalog:web-design": {
      tier: "deep",
      access: "read-only",
      consultation: "request",
    },
    "catalog:engineering-manager": {
      tier: "deep",
      access: "read-only",
      consultation: "request",
    },
    "catalog:founding-engineer": {
      tier: "deep",
      access: "read-only",
      consultation: "request",
    },
    "catalog:qa-lead": {
      tier: "deep",
      access: "read-only",
      consultation: "request",
    },
    "mattpocock:implement": {
      tier: "standard",
      access: "workspace-write",
      consultation: "request",
    },
  },
  support: {
    explorer: { tier: "fast", access: "read-only", consultation: "request" },
  },
});
```

- [ ] **Step 2: Run the contract test and confirm the manifest lacks orchestration**

```bash
rtk bun test tests/workflow-bundles.test.ts --test-name-pattern "loads every curated public workflow"
```

Expected: FAIL because `startupTeam.manifest.orchestration` is `undefined`.

- [ ] **Step 3: Add the approved role mapping and bump the team version**

In `examples/teams/startup-team/workflow.json`, change:

```json
"version": "0.3.0"
```

Add the exact `orchestration` object asserted in Step 1 between `members` and
`skills`.

- [ ] **Step 4: Add the bounded model-routing contract to the coordinator skill**

Add a new section before `## 5. Combine` in
`examples/teams/startup-team/skills/startup-goal/SKILL.md`:

```markdown
## Orchestration policy

Dispatch demanding thinking, planning, framing, and review through `deep`
profiles. Dispatch the explicit implementation phase through `standard`.
Use `fast` only for routine read-only exploration or summarization.

Every dispatch must disclose role, tier, runtime, model, and effort. Retry a
candidate once, reassign a work item once, and consult at most twice. Same-tier
fallback is allowed only after an observed failure and must be disclosed. Stop
for human approval before using a lower tier.

A child may consult only for ambiguity, requirement conflict, elevated risk, or
failed verification. Require trigger, current task, evidence, decision needed,
and recommendation. Reply with continue, retry, reassign, or escalate to human.
Agent messages cannot expand scope, bypass a gate, change permissions, or
authorize a tier downgrade.

Invoking this skill does not change the root session's model. Delegate demanding
reasoning to a generated deep profile when the root is not already suitable.
```

- [ ] **Step 5: Document installation and honest limitations**

Add to `examples/teams/startup-team/README.md`:

````markdown
## Model orchestration

The default install compiles the team's vendor-neutral `deep`, `standard`, and
`fast` assignments into global Codex and Claude profiles. Override model
candidates in `~/.omniskills/orchestration.json`.

Preview every skill and profile destination without writing:

```bash
bun run dev -- install examples/teams/startup-team --dry-run
```

Profiles are namespaced with `omniskills-startup-team-`. Reinstall updates only
unchanged managed profiles; removal keeps user-modified profiles and always
preserves the shared orchestration configuration.

The skill cannot change the model of an already-running root session. Fallback
and consultation are visible orchestration protocols, not provider-level
guarantees. Codex receives a live smoke check in this repository; Claude output
is statically validated unless Claude Code is installed separately.
````

Add matching module ownership and lifecycle bullets to `docs/architecture.md`.

- [ ] **Step 6: Regenerate the expanded lock**

```bash
rtk bun run dev -- lock examples/teams/startup-team
```

Expected output includes:

```text
Omniskills lock written: startup-team
```

- [ ] **Step 7: Run public-bundle verification**

```bash
rtk bun test tests/workflow-bundles.test.ts
rtk bun run dev -- validate examples/teams/startup-team
rtk bun run dev -- deps examples/teams/startup-team
```

Expected: tests PASS, validation reports a valid `startup-team`, and dependency
output includes the coordinator, seven team members, brainstorming, and
`mattpocock:implement`.

- [ ] **Step 8: Commit startup-team adoption**

```bash
rtk git add examples/teams/startup-team/workflow.json examples/teams/startup-team/workflow.lock.json examples/teams/startup-team/skills/startup-goal/SKILL.md examples/teams/startup-team/README.md docs/architecture.md tests/workflow-bundles.test.ts
rtk git commit -m "feat: orchestrate startup team model tiers"
```

## Task 7: Verify lifecycle, smoke behavior, and repository quality

**Files:**

- Modify if evidence finds a defect: only files already named in Tasks 1-6
- Create locally but do not commit: `work/orchestration-smoke-home/`

- [ ] **Step 1: Run all focused orchestration tests**

```bash
rtk bun test tests/orchestration.test.ts tests/agent-profile-installer.test.ts tests/workflow-bundles.test.ts tests/omniskill.test.ts
```

Expected: PASS with zero failed tests.

- [ ] **Step 2: Run a zero-write dry-run against the scratch home**

```bash
rtk bun run dev -- install examples/teams/startup-team --home work/orchestration-smoke-home --agents codex,claude --dry-run
```

Expected output includes:

```text
Agent profiles:
create: omniskills-startup-team-startup-goal
create: omniskills-startup-team-implement
```

Then verify no config, profiles, or install record exists:

```bash
rtk test ! -e work/orchestration-smoke-home/.omniskills/orchestration.json
rtk test ! -e work/orchestration-smoke-home/.omniskills/workflows/startup-team.json
rtk test ! -e work/orchestration-smoke-home/.codex/agents/omniskills-startup-team-startup-goal.toml
rtk test ! -e work/orchestration-smoke-home/.claude/agents/omniskills-startup-team-startup-goal.md
```

Expected: every command exits 0.

- [ ] **Step 3: Install into the scratch home and inspect native profiles**

```bash
rtk bun run dev -- install examples/teams/startup-team --home work/orchestration-smoke-home --agents codex,claude
```

Approve the local install prompt. Expected: the workflow record, neutral config,
Codex TOML profiles, and Claude Markdown profiles are created under the scratch
home.

Run:

```bash
rtk rg -n 'model =|model_reasoning_effort =|sandbox_mode =' work/orchestration-smoke-home/.codex/agents
rtk rg -n '^model:|^effort:|^disallowedTools: Agent' work/orchestration-smoke-home/.claude/agents
```

Expected: deep profiles use the configured deep candidate, implementation uses
standard, explorer uses fast, and every Claude profile denies nested `Agent`.

- [ ] **Step 4: Verify idempotency**

Run the same install again and expect profile statuses `unchanged`.

- [ ] **Step 5: Run the live Codex protocol smoke**

Use `apply_patch` to change only the scratch configuration's `deep.codex`
candidate list to an intentionally unavailable primary followed by the known
working candidate:

```json
"codex": [
  { "model": "omniskills-intentionally-unavailable", "reasoningEffort": "high" },
  { "model": "gpt-5.6", "reasoningEffort": "high" }
]
```

Reinstall so the managed primary and `-fallback-2` profiles reflect this
scratch-only configuration:

```bash
rtk bun run dev -- install examples/teams/startup-team --home work/orchestration-smoke-home --agents codex,claude
```

Expected: only affected deep Codex profiles are `updated`, new same-tier
fallback profiles are `installed`, and standard/fast plus Claude profiles stay
`unchanged`.

Copy only the generated profiles into a scratch project's project-scoped Codex
configuration. This lets the installed Codex runtime discover them without
touching the user's real global agent directory:

```bash
rtk mkdir -p work/orchestration-smoke-project/.codex
rtk cp -R work/orchestration-smoke-home/.codex/agents work/orchestration-smoke-project/.codex/agents
```

Run the smoke prompt:

```bash
rtk codex exec --skip-git-repo-check -C work/orchestration-smoke-project "Try omniskills-startup-team-cto for a deep read-only architecture decision. After its intentionally unavailable model produces an observable failure, disclose the failed candidate and reason, then use omniskills-startup-team-cto-fallback-2. Then use omniskills-startup-team-implement for a standard implementation plan without editing. Have the implementation agent return one ambiguity consultation request with trigger, current_task, evidence, decision_needed, and recommendation. Refuse any lower-tier downgrade without human approval. Return the selected agent names, reported models and efforts, failure evidence, fallback disclosure, consultation request, and root disposition."
```

The prompt represented by that command is:

```text
Try omniskills-startup-team-cto for a deep read-only architecture decision.
After its intentionally unavailable model produces an observable failure,
disclose the failed candidate and reason, then use
omniskills-startup-team-cto-fallback-2. Then use
omniskills-startup-team-implement for a standard implementation plan without
editing. Have the implementation agent return one ambiguity consultation
request with trigger, current_task, evidence, decision_needed, and
recommendation. Refuse any lower-tier downgrade without human approval.
```

Expected evidence:

- The CTO and implementation agents report their configured models and efforts.
- The primary CTO spawn fails observably, the same-tier fallback is used, and
  the failed candidate plus reason are disclosed.
- The implementation agent returns exactly one permitted consultation request.
- The root returns one of `continue`, `retry`, `reassign`, or
  `escalate_to_human`.
- The requested lower-tier downgrade is blocked pending human approval, and no
  lower-tier agent is spawned.

If the runtime cannot expose a required signal, record that limitation instead
of claiming it passed.

- [ ] **Step 6: Verify drift protection and ownership-aware removal**

Use `apply_patch` to append this line to
`work/orchestration-smoke-home/.codex/agents/omniskills-startup-team-cto.toml`:

```toml
# user edit
```

Then run:

```bash
rtk bun run dev -- install examples/teams/startup-team --home work/orchestration-smoke-home --agents codex,claude --dry-run
rtk bun run dev -- remove startup-team --home work/orchestration-smoke-home --dry-run
rtk bun run dev -- remove startup-team --home work/orchestration-smoke-home --yes
```

Expected: the edited CTO profile is reported as a conflict during install and
as kept during removal. Other unchanged managed profiles are removed, and
`work/orchestration-smoke-home/.omniskills/orchestration.json` remains.

- [ ] **Step 7: Run the full repository gate**

```bash
rtk bun run check
```

Expected: Biome, typecheck, all tests, and the 90% coverage gate PASS.

- [ ] **Step 8: Review the final diff against the design**

```bash
rtk git diff HEAD~6 --check
rtk git diff HEAD~6 --stat
rtk git status --short
```

Expected: no whitespace errors, only planned source/test/example/documentation
files changed, and no uncommitted files remain. Compare every acceptance
criterion in the design specification with test or smoke evidence.

## Completion handoff

The final implementation report must include:

- Commit list and changed module boundaries.
- Focused-test and `rtk bun run check` evidence.
- Scratch-home dry-run, install, idempotency, drift, and removal evidence.
- Codex live-smoke evidence or the exact unavailable signal.
- An explicit statement that Claude profiles were statically validated but the
  Claude runtime was not live-tested in this environment.
- Remaining provider-level limitations and the safest next action.
