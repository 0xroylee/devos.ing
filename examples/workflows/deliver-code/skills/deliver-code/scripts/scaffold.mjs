#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const START = "<!-- deliver-code:start -->";
const END = "<!-- deliver-code:end -->";
const assetRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/scaffold");

const REPO_FILES = [
  ["CONTEXT.md", "CONTEXT.md"],
  ["docs/architecture.md", "docs/architecture.md"],
  ["docs/adr/README.md", "docs/adr/README.md"],
  ["docs/design/README.md", "docs/design/README.md"],
  ["docs/specs/README.md", "docs/specs/README.md"],
  [".scratch/deliver-code/README.md", ".scratch/deliver-code/README.md"],
];

async function kind(path) {
  try {
    const value = await stat(path);
    return value.isDirectory() ? "directory" : value.isFile() ? "file" : "other";
  } catch (error) {
    if (error?.code === "ENOENT") return "missing";
    throw error;
  }
}

async function ensureDirectory(path, report) {
  const current = await kind(path);
  if (current === "file" || current === "other") {
    throw new Error(`Scaffold collision: expected directory at ${path}`);
  }
  if (current === "missing") {
    await mkdir(path, { recursive: true });
    report.createdDirectories.push(path);
  }
}

async function ensureFile(path, content, report) {
  const current = await kind(path);
  if (current === "directory" || current === "other") {
    throw new Error(`Scaffold collision: expected file at ${path}`);
  }
  if (current === "file") {
    report.preservedFiles.push(path);
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, { encoding: "utf8", flag: "wx" });
  report.createdFiles.push(path);
}

async function reconcileAgents(repoDir, knowledgeDir, report) {
  const path = join(repoDir, "AGENTS.md");
  const section = (await readFile(join(assetRoot, "AGENTS.section.md"), "utf8")).replaceAll(
    "{{KNOWLEDGE_DIR}}",
    knowledgeDir,
  );
  if ((await kind(path)) === "missing") {
    await writeFile(path, `${section.trim()}\n`, { encoding: "utf8", flag: "wx" });
    report.createdFiles.push(path);
    return;
  }
  if ((await kind(path)) !== "file") {
    throw new Error(`Scaffold collision: expected file at ${path}`);
  }
  const current = await readFile(path, "utf8");
  const start = current.indexOf(START);
  const end = current.indexOf(END);
  if (start === -1 && end === -1) {
    await writeFile(path, `${current.trimEnd()}\n\n${section.trim()}\n`, "utf8");
    report.updatedFiles.push(path);
    return;
  }
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Scaffold collision: invalid deliver-code markers in ${path}`);
  }
  const next = `${current.slice(0, start)}${section.trim()}${current.slice(end + END.length)}`;
  if (next === current) report.preservedFiles.push(path);
  else {
    await writeFile(path, next, "utf8");
    report.updatedFiles.push(path);
  }
}

export async function scaffoldRepository(input) {
  const repoDir = resolve(input.repoDir);
  const knowledgeDir = resolve(
    input.knowledgeDir ?? join(dirname(repoDir), `${basename(repoDir)}.knowledge`),
  );
  const report = {
    repoDir,
    knowledgeDir,
    createdDirectories: [],
    createdFiles: [],
    updatedFiles: [],
    preservedFiles: [],
  };

  await ensureDirectory(repoDir, report);
  for (const directory of [
    "docs",
    "docs/adr",
    "docs/design",
    "docs/specs",
    ".scratch/deliver-code",
  ]) {
    await ensureDirectory(join(repoDir, directory), report);
  }
  await ensureDirectory(knowledgeDir, report);
  for (const directory of ["research", "sources", "experiments"]) {
    await ensureDirectory(join(knowledgeDir, directory), report);
  }
  for (const [target, asset] of REPO_FILES) {
    await ensureFile(join(repoDir, target), await readFile(join(assetRoot, asset), "utf8"), report);
  }
  await ensureFile(
    join(knowledgeDir, "README.md"),
    await readFile(join(assetRoot, "knowledge/README.md"), "utf8"),
    report,
  );
  await reconcileAgents(repoDir, knowledgeDir, report);
  return report;
}
