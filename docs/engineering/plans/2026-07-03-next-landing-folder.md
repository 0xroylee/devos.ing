# Next Landing Folder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use mattpocock:subagent-driven-development (recommended) or mattpocock:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated `landing/` Next.js 16 + Tailwind CSS app that ports the downloaded Omniskills workflow landing page without changing the root CLI package.

**Architecture:** The root package remains the Bun CLI. `landing/` is a separate Next App Router app with its own package manifest, Tailwind/PostCSS config, typed content module, reusable presentation components, and source attribution.

**Tech Stack:** Bun, Next.js 16.2.0, React 19.2.7, Tailwind CSS 4.1.12, TypeScript 5.9.3, lucide-react 0.487.0, Bun tests for the repository-level landing source contract.

---

## Test Seams

The public seam under test is the repository-visible landing app contract:

- `landing/package.json` declares an isolated Next 16 app with Bun scripts and stable dependency pins.
- `landing/app/page.tsx`, `landing/lib/landing-content.ts`, and `landing/ATTRIBUTIONS.md` expose the expected product copy, workflow examples, root-first commands, and attribution.
- `bun run typecheck` and `bun run build` inside `landing/` verify the app compiles.

Do not test private component details. The source contract test should read files and assert public strings and package metadata.

## Dependency Pins

The repo recency check has already allowed these versions:

- `next@16.2.0` published 2026-03-18.
- `react@19.2.7` and `react-dom@19.2.7` published 2026-06-01.
- `lucide-react@0.487.0` published 2025-04-02.
- `tailwindcss@4.1.12` and `@tailwindcss/postcss@4.1.12` published 2025-08-14.
- `typescript@5.9.3` published 2025-09-30.
- `@types/react@19.1.8`, `@types/react-dom@19.1.6`, and `@types/node@24.0.14` are all older than 30 days.

`next@16.2.10` is current in official docs, but it is blocked here because it was published on 2026-07-01. Use `next@16.2.0` unless the human owner explicitly approves a newer package.

## File Structure

- Create: `tests/landing-app.test.ts`  
  Repository-level source contract test for the landing app.
- Create: `landing/package.json`  
  Isolated app manifest with Bun scripts and pinned dependencies.
- Create: `landing/tsconfig.json`  
  Next-compatible TypeScript config.
- Create: `landing/next-env.d.ts`  
  Next type references.
- Create: `landing/postcss.config.mjs`  
  Tailwind PostCSS plugin config.
- Create: `landing/app/globals.css`  
  Tailwind import and stable global defaults.
- Create: `landing/app/layout.tsx`  
  Metadata and document shell.
- Create: `landing/app/page.tsx`  
  Static App Router page entry.
- Create: `landing/lib/landing-content.ts`  
  Typed workflow, command, agent, and step content.
- Create: `landing/components/landing-page.tsx`  
  Client-side composition for command selection and workflow search.
- Create: `landing/components/workflow-card.tsx`  
  Workflow card presentation component.
- Create: `landing/components/terminal-block.tsx`  
  Terminal command display and copy affordance.
- Create: `landing/components/flow-diagram.tsx`  
  Semantic workflow flow diagram.
- Create: `landing/ATTRIBUTIONS.md`  
  Source attribution for the Figma export.
- Create: `landing/README.md`  
  Local run and verification instructions.
- Modify: `README.md`  
  Add a short local landing-app development note.
- Modify: `openspec/changes/create-next-landing-folder/tasks.md`  
  Mark implementation planning complete after this plan is written.

---

### Task 1: Add The Landing Source Contract Test

**Files:**
- Create: `tests/landing-app.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/landing-app.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const landingRoot = join(repoRoot, "landing");

function readLandingFile(path: string): string {
  return readFileSync(join(landingRoot, path), "utf8");
}

describe("landing app source contract", () => {
  test("is an isolated Next 16 app with Bun scripts", () => {
    const packagePath = join(landingRoot, "package.json");

    expect(existsSync(packagePath)).toBe(true);

    const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
      private?: boolean;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(pkg.private).toBe(true);
    expect(pkg.scripts?.dev).toBe("next dev");
    expect(pkg.scripts?.build).toBe("next build");
    expect(pkg.scripts?.typecheck).toBe("tsc --noEmit");
    expect(pkg.dependencies?.next).toBe("16.2.0");
    expect(pkg.dependencies?.react).toBe("19.2.7");
    expect(pkg.dependencies?.["react-dom"]).toBe("19.2.7");
    expect(pkg.devDependencies?.tailwindcss).toBe("4.1.12");
    expect(pkg.devDependencies?.["@tailwindcss/postcss"]).toBe("4.1.12");
  });

  test("presents Omniskills workflow bundles and root-first commands", () => {
    const page = readLandingFile("app/page.tsx");
    const content = readLandingFile("lib/landing-content.ts");

    expect(page).toContain("LandingPage");
    expect(content).toContain("Omniskills");
    expect(content).toContain("OpenSpec Delivery");
    expect(content).toContain("Release Review");
    expect(content).toContain("Real Engineering");
    expect(content).toContain("Development Design Delivery");
    expect(content).toContain("npx omniskill install");
    expect(content).toContain("npx omniskill validate");
    expect(content).not.toContain("npx omniskill omniskill");
  });

  test("keeps attribution with the landing source", () => {
    const attribution = readLandingFile("ATTRIBUTIONS.md");

    expect(attribution).toContain("Create Omniskills Workflows");
    expect(attribution).toContain("Figma");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: FAIL because `landing/package.json` does not exist yet.

---

### Task 2: Create The Next App Scaffold

**Files:**
- Create: `landing/package.json`
- Create: `landing/tsconfig.json`
- Create: `landing/next-env.d.ts`
- Create: `landing/postcss.config.mjs`
- Create: `landing/app/globals.css`
- Create: `landing/app/layout.tsx`
- Create: `landing/README.md`
- Create: `landing/ATTRIBUTIONS.md`

- [ ] **Step 1: Create `landing/package.json`**

```json
{
  "name": "omniskill-landing",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "check": "bun run typecheck && bun run build"
  },
  "dependencies": {
    "lucide-react": "0.487.0",
    "next": "16.2.0",
    "react": "19.2.7",
    "react-dom": "19.2.7"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "4.1.12",
    "@types/node": "24.0.14",
    "@types/react": "19.1.8",
    "@types/react-dom": "19.1.6",
    "tailwindcss": "4.1.12",
    "typescript": "5.9.3"
  }
}
```

- [ ] **Step 2: Create `landing/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `landing/next-env.d.ts`**

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is generated for Next.js type support.
```

- [ ] **Step 4: Create `landing/postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 5: Create `landing/app/globals.css`**

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
  background: #080808;
  color: #ffffff;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #080808;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
}

::selection {
  background: rgb(139 92 246 / 0.3);
}
```

- [ ] **Step 6: Create `landing/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omniskills",
  description:
    "Install a complete AI-agent workflow as one callable Omniskills skill.",
  metadataBase: new URL("https://github.com/0xroylee/omniskill"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create `landing/README.md`**

````markdown
# Omniskills Landing

This folder contains the isolated Next.js landing app for Omniskills.

## Run Locally

```bash
bun install
bun run dev
```

## Verify

```bash
bun run typecheck
bun run build
```

The root CLI package remains outside this folder. Do not add landing-only
dependencies to the repository root package.
````

- [ ] **Step 8: Create `landing/ATTRIBUTIONS.md`**

```markdown
# Attributions

This landing app ports the visual and content direction from the downloaded
Figma export "Create Omniskills Workflows" at:

https://www.figma.com/design/DMQ1Y2sETB8Scq9gwyMiZW/Create-Omniskills-Workflows

The original export included notes for shadcn/ui and Unsplash assets. This
Next.js implementation does not copy shadcn/ui source components or Unsplash
images, but the source-design attribution is preserved here for auditability.
```

- [ ] **Step 9: Run the focused test again**

Run:

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: still FAIL because `landing/app/page.tsx` and `landing/lib/landing-content.ts` are not created yet.

---

### Task 3: Port The Landing Content And Components

**Files:**
- Create: `landing/lib/landing-content.ts`
- Create: `landing/components/workflow-card.tsx`
- Create: `landing/components/terminal-block.tsx`
- Create: `landing/components/flow-diagram.tsx`
- Create: `landing/components/landing-page.tsx`
- Create: `landing/app/page.tsx`

- [ ] **Step 1: Create `landing/lib/landing-content.ts`**

```typescript
export interface WorkflowSkill {
  name: string;
  description: string;
}

export interface WorkflowCardContent {
  name: string;
  description: string;
  entrySkill: string;
  tag: string;
  accent: string;
  skills: WorkflowSkill[];
}

export interface CommandExample {
  label: string;
  command: string;
}

export const githubUrl = "https://github.com/0xroylee/omniskill";

export const agents = [
  "Claude",
  "Codex",
  "opencode",
  "Cursor",
  "GitHub Copilot",
];

export const workflows: WorkflowCardContent[] = [
  {
    name: "OpenSpec Delivery",
    description:
      "A complete delivery lifecycle from proposal through design, TDD build, verification, and archive.",
    entrySkill: "openspec-delivery",
    tag: "Featured",
    accent: "text-violet-300",
    skills: [
      { name: "opsx-propose", description: "Draft the scoped spec change" },
      { name: "brainstorming", description: "Explore viable design approaches" },
      { name: "writing-plans", description: "Create an executable implementation plan" },
      { name: "tdd-build", description: "Build task by task with tests first" },
      { name: "pony-trail", description: "Record verification and rollback context" },
    ],
  },
  {
    name: "Release Review",
    description:
      "A lightweight workflow for shaping release risk, reviewing diffs, and preserving evidence.",
    entrySkill: "release-review",
    tag: "Starter",
    accent: "text-sky-300",
    skills: [
      { name: "shape", description: "Clarify the release request" },
      { name: "release-risk-review", description: "Flag risk by surface area" },
      { name: "writing-plans", description: "Plan the release follow-through" },
      { name: "pony-trail", description: "Capture evidence and rollback notes" },
    ],
  },
  {
    name: "Real Engineering",
    description:
      "Combines RTK, pony-trail, Matt Pocock, and Matt Pocock skills for TypeScript-heavy engineering.",
    entrySkill: "real-engineering",
    tag: "Advanced",
    accent: "text-amber-300",
    skills: [
      { name: "rtk", description: "Token-efficient command execution" },
      { name: "mattpocock:tdd", description: "Focused red-green-refactor loops" },
      { name: "mattpocock:code-review", description: "Completion checks before delivery" },
      { name: "pony-trail", description: "Decision snapshots around file changes" },
    ],
  },
  {
    name: "Development Design Delivery",
    description:
      "Product-minded engineering from shape to interface design, plan, TDD, review, and evidence.",
    entrySkill: "development-design-delivery",
    tag: "Product",
    accent: "text-emerald-300",
    skills: [
      { name: "brainstorming", description: "Shape the feature and constraints" },
      { name: "design-an-interface", description: "Explore interface directions" },
      { name: "writing-plans", description: "Split the work into small tasks" },
      { name: "tdd", description: "Build through public seams" },
      { name: "review", description: "Check behavior and risks" },
    ],
  },
];

export const commands: CommandExample[] = [
  {
    label: "Install OpenSpec Delivery",
    command:
      "npx omniskill install 'https://github.com/0xroylee/omniskill.git#examples/workflows/openspec-delivery'",
  },
  {
    label: "Install Release Review",
    command:
      "npx omniskill install 'https://github.com/0xroylee/omniskill.git#examples/workflows/release-review'",
  },
  {
    label: "List installed Omniskillss",
    command: "npx omniskill list",
  },
  {
    label: "Create your own workflow",
    command: "npx omniskill init my-workflow",
  },
  {
    label: "Validate before sharing",
    command: "npx omniskill validate my-workflow",
  },
];

export const howItWorks = [
  {
    title: "workflow.json installs the skill tree",
    body: "A single manifest defines the callable entry skill and every local or external sub-skill it needs.",
  },
  {
    title: "The entry skill is the one command users call",
    body: "Users invoke a single skill, such as $openspec-delivery, and the workflow coordinates the rest.",
  },
  {
    title: "Sub-skills run in a deliberate order",
    body: "Proposal, design, planning, TDD, verification, and archive steps stay aligned without manual juggling.",
  },
];
```

- [ ] **Step 2: Create `landing/components/workflow-card.tsx`**

```tsx
import { ArrowRight, Zap } from "lucide-react";
import type { WorkflowCardContent } from "../lib/landing-content";

export function WorkflowCard({
  name,
  description,
  entrySkill,
  skills,
  tag,
  accent,
}: WorkflowCardContent) {
  return (
    <article className="group relative rounded-lg border border-white/10 bg-white/[0.035] p-5 transition hover:border-white/20 hover:bg-white/[0.06]">
      <span className={`inline-flex rounded-full border border-current/20 px-2 py-0.5 text-xs ${accent}`}>
        {tag}
      </span>
      <h3 className="mt-4 text-lg font-medium text-white/90">{name}</h3>
      <p className="mt-2 min-h-16 text-sm leading-6 text-white/50">{description}</p>

      <div className="mt-5 rounded-lg border border-white/10 bg-black/35 p-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/35">
          <Zap size={12} className="text-amber-300" />
          entry skill
        </div>
        <code className={`mt-2 block break-all font-mono text-sm ${accent}`}>${entrySkill}</code>
      </div>

      <div className="mt-5 space-y-3">
        {skills.map((skill) => (
          <div key={skill.name} className="flex gap-3">
            <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/25" />
            <div>
              <code className="font-mono text-xs text-white/65">{skill.name}</code>
              <p className="mt-0.5 text-xs leading-5 text-white/38">{skill.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-1.5 text-xs text-white/35 transition group-hover:text-white/55">
        View workflow
        <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Create `landing/components/terminal-block.tsx`**

```tsx
"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface TerminalLine {
  prefix?: string;
  text: string;
  dim?: boolean;
}

interface TerminalBlockProps {
  lines: TerminalLine[];
  copyText?: string;
}

export function TerminalBlock({ lines, copyText }: TerminalBlockProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!copyText) return;
    void navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0d0d0d]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/60" />
        </div>
        {copyText ? (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-xs text-white/35 transition hover:text-white/70"
          >
            {copied ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
      </div>
      <div className="space-y-1.5 overflow-x-auto p-4 font-mono text-sm">
        {lines.map((line, index) => (
          <div key={`${line.text}-${index}`} className="flex min-w-0 gap-2">
            {line.prefix ? <span className="shrink-0 select-none text-white/25">{line.prefix}</span> : null}
            <span className={`min-w-0 break-words ${line.dim ? "text-white/35" : "text-white/80"}`}>
              {line.text || "\u00a0"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `landing/components/flow-diagram.tsx`**

```tsx
import { ArrowDown } from "lucide-react";

const steps = [
  {
    label: "User invokes",
    value: "$openspec-delivery",
    classes: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  },
  {
    label: "Entry skill coordinates",
    value: "SKILL.md orchestrator",
    classes: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  },
  {
    label: "Sub-skills run in order",
    values: ["proposal", "brainstorm", "plan", "TDD", "verify", "archive"],
    classes: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  },
];

export function FlowDiagram() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center">
      {steps.map((step, index) => (
        <div key={step.label} className="flex w-full flex-col items-center">
          <div className={`w-full rounded-lg border px-4 py-3 ${step.classes}`}>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">{step.label}</p>
            {"value" in step ? (
              <code className="font-mono text-sm">{step.value}</code>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {step.values.map((value) => (
                  <code key={value} className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs">
                    {value}
                  </code>
                ))}
              </div>
            )}
          </div>
          {index < steps.length - 1 ? (
            <div className="py-2 text-white/25">
              <ArrowDown size={16} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create `landing/components/landing-page.tsx`**

```tsx
"use client";

import {
  ArrowRight,
  ChevronRight,
  Github,
  Layers,
  Package,
  Search,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FlowDiagram } from "./flow-diagram";
import { TerminalBlock } from "./terminal-block";
import { WorkflowCard } from "./workflow-card";
import { agents, commands, githubUrl, howItWorks, workflows } from "../lib/landing-content";

export function LandingPage() {
  const [activeCommand, setActiveCommand] = useState(0);
  const [query, setQuery] = useState("");

  const filteredWorkflows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return workflows;

    return workflows.filter((workflow) => {
      return (
        workflow.name.toLowerCase().includes(needle) ||
        workflow.description.toLowerCase().includes(needle) ||
        workflow.entrySkill.toLowerCase().includes(needle) ||
        workflow.tag.toLowerCase().includes(needle) ||
        workflow.skills.some(
          (skill) =>
            skill.name.toLowerCase().includes(needle) ||
            skill.description.toLowerCase().includes(needle),
        )
      );
    });
  }, [query]);

  const active = commands[activeCommand] ?? commands[0];

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500">
            <Zap size={14} />
          </span>
          <span className="text-sm font-medium text-white/90">Omniskills</span>
        </a>
        <div className="flex items-center gap-5 text-sm text-white/50">
          <a href="#workflows" className="transition hover:text-white/80">Workflows</a>
          <a href="#how-it-works" className="hidden transition hover:text-white/80 sm:inline">How it works</a>
          <a href="#install" className="transition hover:text-white/80">Install</a>
          <a href={githubUrl} className="inline-flex items-center gap-1.5 transition hover:text-white/80">
            <Github size={15} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </nav>

      <section id="top" className="relative z-10 mx-auto max-w-4xl px-5 pb-20 pt-20 text-center">
        <div className="mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          <span className="truncate">Works with Claude, Codex, Cursor, opencode, and GitHub Copilot</span>
        </div>
        <h1 className="text-5xl font-semibold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
          One command.
          <br />
          Whole workflow.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/48">
          Omniskills packages a complete AI-agent workflow as a single callable skill.
          Install once, invoke the entry skill, and the agent follows every required sub-skill in order.
        </p>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <div className="rounded-lg border border-white/10 bg-[#0d0d0d] px-4 py-3 font-mono text-sm text-white/70">
            <span className="break-words">npx omniskill install ...</span>
          </div>
          <a
            href="#workflows"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-400"
          >
            Browse workflows
            <ArrowRight size={14} />
          </a>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {agents.map((agent) => (
            <span key={agent} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/42">
              {agent}
            </span>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/32">How it works</p>
          <h2 className="text-3xl font-medium text-white/90">Install the skill tree. Invoke once.</h2>
        </div>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <FlowDiagram />
          <div className="space-y-6">
            {howItWorks.map((item, index) => {
              const icons = [Package, Zap, Layers];
              const Icon = icons[index] ?? Package;
              return (
                <div key={item.title} className="flex gap-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/55">
                    <Icon size={16} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white/82">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/42">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflows" className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/32">Workflow bundles</p>
          <h2 className="text-3xl font-medium text-white/90">Pick a Omniskills</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/42">
            Each workflow is a shareable bundle of skills with one entry point.
          </p>
        </div>
        <div className="relative mx-auto mb-10 max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workflows, skills, tags..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-9 text-sm text-white/80 outline-none transition placeholder:text-white/25 focus:border-violet-400/50"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white/70"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard key={workflow.name} {...workflow} />
          ))}
        </div>
      </section>

      <section id="install" className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/32">Common commands</p>
            <h2 className="mb-4 text-3xl font-medium text-white/90">Get up and running fast</h2>
            <p className="mb-8 text-sm leading-6 text-white/45">
              Install from npm, git, or a local path. The CLI handles validation,
              dependency resolution, and local workflow records under <code className="text-white/65">.omniskills/</code>.
            </p>
            <div className="space-y-2">
              {commands.map((command, index) => (
                <button
                  key={command.label}
                  type="button"
                  onClick={() => setActiveCommand(index)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                    activeCommand === index
                      ? "border-violet-400/45 bg-violet-400/10 text-white/85"
                      : "border-white/10 bg-white/[0.025] text-white/45 hover:border-white/20 hover:text-white/70"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>{command.label}</span>
                    <ChevronRight size={14} className={activeCommand === index ? "text-violet-300" : "text-white/25"} />
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <TerminalBlock copyText={active.command} lines={[{ prefix: "$", text: active.command }]} />
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/35">Then invoke in your agent</p>
              <TerminalBlock
                lines={[
                  { prefix: ">", text: "$openspec-delivery implement this OpenSpec change" },
                  { text: "", dim: true },
                  { text: "[ok] proposal   scoped the change", dim: true },
                  { text: "[ok] design     selected the approach", dim: true },
                  { text: "[ok] plan       wrote executable tasks", dim: true },
                  { text: "[ok] TDD        built through public seams", dim: true },
                  { text: "[ok] archive    preserved project knowledge", dim: true },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] p-8 text-center sm:p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-200">
            <Workflow size={12} />
            Author your own workflow
          </div>
          <h2 className="mb-3 text-3xl font-medium text-white/90">Package your workflow as a Omniskills</h2>
          <p className="mx-auto mb-8 max-w-xl text-sm leading-6 text-white/45">
            Scaffold a bundle, define the entry skill, list sub-skills in workflow.json,
            validate, and share. The authoring guide keeps the skill tree aligned.
          </p>
          <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <TerminalBlock
              copyText="npx omniskill init my-workflow"
              lines={[{ prefix: "$", text: "npx omniskill init my-workflow" }]}
            />
            <a
              href={`${githubUrl}/blob/main/docs/workflow-author-guide.md`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-5 py-3 text-sm text-white/62 transition hover:border-white/20 hover:text-white/85"
            >
              Author guide
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-6xl border-t border-white/10 px-5 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-white/35">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500">
              <Zap size={10} className="text-white" />
            </span>
            Omniskills
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <a href={githubUrl} className="transition hover:text-white/60">GitHub</a>
            <a href={`${githubUrl}/blob/main/README.md`} className="transition hover:text-white/60">Docs</a>
            <a href={`${githubUrl}/blob/main/docs/workflow-author-guide.md`} className="transition hover:text-white/60">Author Guide</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
```

- [ ] **Step 6: Create `landing/app/page.tsx`**

```tsx
import { LandingPage } from "../components/landing-page";

export default function Page() {
  return <LandingPage />;
}
```

- [ ] **Step 7: Run the focused test to verify it passes**

Run:

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the green source contract slice**

Run:

```bash
git add tests/landing-app.test.ts landing
git commit -m "feat: add Next landing app"
```

Expected: commit succeeds with the test and `landing/` source.

---

### Task 4: Add Root Documentation For The Landing App

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the landing app note to the Local Development section**

Update the `## Local Development` section to:

````markdown
## Local Development

```bash
bun install
bun run build
bun test
bun run check
bun scripts/smoke-public-git-install.ts
```

Landing app:

```bash
cd landing
bun install
bun run dev
bun run build
```
````

- [ ] **Step 2: Run the focused source contract test**

Run:

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit the docs slice**

Run:

```bash
git add README.md
git commit -m "docs: document landing app workflow"
```

Expected: commit succeeds with the README update.

---

### Task 5: Install, Build, And Run Full Verification

**Files:**
- Generated: `landing/bun.lock`
- Generated by build: `landing/.next/`

- [ ] **Step 1: Install landing dependencies**

Run:

```bash
cd landing
bun install
```

Expected: dependencies install and `landing/bun.lock` is created. If this fails with a network or registry error in Codex, rerun the same command with sandbox escalation.

- [ ] **Step 2: Typecheck the landing app**

Run:

```bash
cd landing
bun run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Build the landing app**

Run:

```bash
cd landing
bun run build
```

Expected: PASS and Next reports a successful production build.

- [ ] **Step 4: Run the root source contract test**

Run:

```bash
rtk bun test tests/landing-app.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the OpenSpec validation**

Run:

```bash
rtk openspec validate create-next-landing-folder --strict
```

Expected: `Change 'create-next-landing-folder' is valid`.

- [ ] **Step 6: Run the full repository gate**

Run:

```bash
rtk bun run check
```

Expected: PASS.

- [ ] **Step 7: Remove generated build output if untracked**

Run:

```bash
git status --short --untracked-files=all
```

Expected: `landing/.next/` may appear as untracked generated output. Remove generated build output only if it is untracked and not meant to be committed. Keep `landing/bun.lock`.

- [ ] **Step 8: Commit verification artifacts**

Run:

```bash
git add landing/bun.lock
git commit -m "chore: lock landing dependencies"
```

Expected: commit succeeds if `landing/bun.lock` was created or updated. If the lockfile was already committed in Task 3, skip this commit and note that no dependency-lock diff remained.

---

### Task 6: Mark OpenSpec Implementation Progress

**Files:**
- Modify: `openspec/changes/create-next-landing-folder/tasks.md`

- [ ] **Step 1: Mark implementation and verification tasks complete**

Update the implementation and verification sections in `openspec/changes/create-next-landing-folder/tasks.md` so completed checked items match the work that passed:

```markdown
## 4. Implement With TDD

- [x] Add a failing check or test for the landing page's expected product text
      and workflow cards.
- [x] Create the `landing/` Next.js 16 app scaffold.
- [x] Port the Figma/Vite export into Next.js components.
- [x] Adapt global styling to Tailwind CSS.
- [x] Preserve attribution and add local run instructions.
- [x] Run focused landing checks.

## 5. Verify And Archive

- [x] Run landing app checks.
- [x] Run `rtk bun run check`.
- [x] Run a landing smoke check.
- [x] Record Pony Trail post-change evidence.
- [ ] Run `/opsx:archive` after human approval.
```

- [ ] **Step 2: Validate OpenSpec again**

Run:

```bash
rtk openspec validate create-next-landing-folder --strict
```

Expected: `Change 'create-next-landing-folder' is valid`.

- [ ] **Step 3: Commit task checklist progress**

Run:

```bash
git add openspec/changes/create-next-landing-folder/tasks.md
git commit -m "docs: mark landing implementation verified"
```

Expected: commit succeeds with only the checklist update.

## Execution Notes

- Use Pony Trail snapshots before each file mutation group and post snapshots after each group.
- Use `apply_patch` for manual file edits.
- If `bun install` or `bun run build` needs network access and fails in the sandbox, rerun the same command with escalation.
- Do not archive the OpenSpec change until the human owner approves the completed implementation.
