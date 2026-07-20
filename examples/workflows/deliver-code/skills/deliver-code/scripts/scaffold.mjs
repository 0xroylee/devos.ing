#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const START = "<!-- deliver-code:start -->";
const END = "<!-- deliver-code:end -->";
const FLAGS = new Set(["--repo", "--knowledge-dir", "--dry-run", "--json"]);
const assetRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/scaffold");

const REPO_FILES = [
  ["CONTEXT.md", "CONTEXT.md"],
  ["docs/architecture.md", "docs/architecture.md"],
  ["docs/adr/README.md", "docs/adr/README.md"],
  ["docs/design/README.md", "docs/design/README.md"],
  ["docs/specs/README.md", "docs/specs/README.md"],
  [".scratch/deliver-code/README.md", ".scratch/deliver-code/README.md"],
];

export function parseArgs(argv) {
  let repoDir = process.cwd();
  let knowledgeDir;
  let dryRun = false;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!FLAGS.has(flag)) throw new Error(`Unknown flag: ${flag}`);
    if (flag === "--dry-run" || flag === "--json") {
      if (flag === "--dry-run") dryRun = true;
      else json = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    if (flag === "--repo") repoDir = value;
    else knowledgeDir = value;
    index += 1;
  }
  return { repoDir, ...(knowledgeDir ? { knowledgeDir } : {}), dryRun, json };
}

export function formatScaffoldError(error, knowledgeDir) {
  const denied = error?.code === "EACCES" || error?.code === "EPERM";
  const deniedPath = typeof error?.path === "string" ? resolve(error.path) : "";
  const knowledgeRoot = resolve(knowledgeDir);
  const belongsToKnowledge =
    deniedPath === knowledgeRoot || deniedPath.startsWith(`${knowledgeRoot}${sep}`);
  if (denied && belongsToKnowledge) {
    return `Cannot create or update the sibling knowledge directory ${knowledgeDir}. Request filesystem permission; do not move heavy research into the repository.`;
  }
  return error instanceof Error ? error.message : String(error);
}

async function kind(path) {
  try {
    const value = await stat(path);
    return value.isDirectory() ? "directory" : value.isFile() ? "file" : "other";
  } catch (error) {
    if (error?.code === "ENOENT") return "missing";
    throw error;
  }
}

async function validateDirectory(path) {
  const current = await kind(path);
  if (current === "file" || current === "other") {
    throw new Error(`Scaffold collision: expected directory at ${path}`);
  }
}

async function validateFile(path) {
  const current = await kind(path);
  if (current === "directory" || current === "other") {
    throw new Error(`Scaffold collision: expected file at ${path}`);
  }
}

async function validateAgents(path) {
  const currentKind = await kind(path);
  if (currentKind === "missing") return;
  if (currentKind !== "file") {
    throw new Error(`Scaffold collision: expected file at ${path}`);
  }
  const current = await readFile(path, "utf8");
  const start = current.indexOf(START);
  const end = current.indexOf(END);
  if (start === -1 && end === -1) return;
  if (
    start === -1 ||
    end === -1 ||
    end < start ||
    start !== current.lastIndexOf(START) ||
    end !== current.lastIndexOf(END)
  ) {
    throw new Error(`Scaffold collision: invalid deliver-code markers in ${path}`);
  }
}

async function validateScaffold(repoDir, knowledgeDir) {
  for (const path of [
    repoDir,
    join(repoDir, "docs"),
    join(repoDir, "docs/adr"),
    join(repoDir, "docs/design"),
    join(repoDir, "docs/specs"),
    join(repoDir, ".scratch/deliver-code"),
    knowledgeDir,
    join(knowledgeDir, "research"),
    join(knowledgeDir, "sources"),
    join(knowledgeDir, "experiments"),
  ]) {
    await validateDirectory(path);
  }
  for (const [target] of REPO_FILES) {
    await validateFile(join(repoDir, target));
  }
  await validateFile(join(knowledgeDir, "README.md"));
  await validateAgents(join(repoDir, "AGENTS.md"));
}

async function ensureDirectory(path, report, dryRun) {
  const current = await kind(path);
  if (current === "file" || current === "other") {
    throw new Error(`Scaffold collision: expected directory at ${path}`);
  }
  if (current === "missing") {
    if (!dryRun) await mkdir(path, { recursive: true });
    report.createdDirectories.push(path);
  }
}

async function ensureFile(path, content, report, dryRun) {
  const current = await kind(path);
  if (current === "directory" || current === "other") {
    throw new Error(`Scaffold collision: expected file at ${path}`);
  }
  if (current === "file") {
    report.preservedFiles.push(path);
    return;
  }
  if (!dryRun) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, { encoding: "utf8", flag: "wx" });
  }
  report.createdFiles.push(path);
}

async function reconcileAgents(repoDir, knowledgeDir, report, dryRun) {
  const path = join(repoDir, "AGENTS.md");
  const section = (await readFile(join(assetRoot, "AGENTS.section.md"), "utf8")).replaceAll(
    "{{KNOWLEDGE_DIR}}",
    knowledgeDir,
  );
  const currentKind = await kind(path);
  if (currentKind === "missing") {
    if (!dryRun) {
      await writeFile(path, `${section.trim()}\n`, { encoding: "utf8", flag: "wx" });
    }
    report.createdFiles.push(path);
    return;
  }
  if (currentKind !== "file") {
    throw new Error(`Scaffold collision: expected file at ${path}`);
  }

  const current = await readFile(path, "utf8");
  const start = current.indexOf(START);
  const end = current.indexOf(END);
  if (start === -1 && end === -1) {
    if (!dryRun) {
      await writeFile(path, `${current.trimEnd()}\n\n${section.trim()}\n`, "utf8");
    }
    report.updatedFiles.push(path);
    return;
  }
  if (
    start === -1 ||
    end === -1 ||
    end < start ||
    start !== current.lastIndexOf(START) ||
    end !== current.lastIndexOf(END)
  ) {
    throw new Error(`Scaffold collision: invalid deliver-code markers in ${path}`);
  }

  const next = `${current.slice(0, start)}${section.trim()}${current.slice(end + END.length)}`;
  if (next === current) {
    report.preservedFiles.push(path);
    return;
  }
  if (!dryRun) await writeFile(path, next, "utf8");
  report.updatedFiles.push(path);
}

export async function scaffoldRepository(input) {
  const repoDir = resolve(input.repoDir);
  const knowledgeDir = resolve(
    input.knowledgeDir ?? join(dirname(repoDir), `${basename(repoDir)}.knowledge`),
  );
  const dryRun = input.dryRun ?? false;
  await validateScaffold(repoDir, knowledgeDir);
  const report = {
    repoDir,
    knowledgeDir,
    dryRun,
    createdDirectories: [],
    createdFiles: [],
    updatedFiles: [],
    preservedFiles: [],
  };

  await ensureDirectory(repoDir, report, dryRun);
  for (const directory of [
    "docs",
    "docs/adr",
    "docs/design",
    "docs/specs",
    ".scratch/deliver-code",
  ]) {
    await ensureDirectory(join(repoDir, directory), report, dryRun);
  }
  await ensureDirectory(knowledgeDir, report, dryRun);
  for (const directory of ["research", "sources", "experiments"]) {
    await ensureDirectory(join(knowledgeDir, directory), report, dryRun);
  }
  for (const [target, asset] of REPO_FILES) {
    await ensureFile(
      join(repoDir, target),
      await readFile(join(assetRoot, asset), "utf8"),
      report,
      dryRun,
    );
  }
  await ensureFile(
    join(knowledgeDir, "README.md"),
    await readFile(join(assetRoot, "knowledge/README.md"), "utf8"),
    report,
    dryRun,
  );
  await reconcileAgents(repoDir, knowledgeDir, report, dryRun);
  return report;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
  let knowledgeDir = "";
  try {
    const input = parseArgs(process.argv.slice(2));
    const repoDir = resolve(input.repoDir);
    knowledgeDir = resolve(
      input.knowledgeDir ?? join(dirname(repoDir), `${basename(repoDir)}.knowledge`),
    );
    const report = await scaffoldRepository(input);
    process.stdout.write(
      input.json
        ? `${JSON.stringify(report)}\n`
        : `Scaffold ready: ${report.createdFiles.length} created, ${report.updatedFiles.length} updated.\n`,
    );
  } catch (error) {
    process.stderr.write(`${formatScaffoldError(error, knowledgeDir || process.cwd())}\n`);
    process.exitCode = 1;
  }
}
