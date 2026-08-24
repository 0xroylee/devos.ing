import { runSubprocess } from "../process";
import { materializePinnedSkillSource } from "./pinned-skill-source";
import { getInterfaceCraftInstalledSkillName } from "./skill-installer";

export interface OmniskillExternalSkillCommand {
  executable: string;
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
}

export interface OmniskillExternalSkillCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type OmniskillExternalSkillCommandRunner = (
  command: OmniskillExternalSkillCommand,
) => Promise<OmniskillExternalSkillCommandResult>;

export interface OmniskillExternalSkillDependencyInstallInput {
  source: string;
  repo?: string;
  homeDir: string;
  runCommand?: OmniskillExternalSkillCommandRunner;
}

export type OmniskillExternalSkillDependencyInstaller = (
  input: OmniskillExternalSkillDependencyInstallInput,
) => Promise<void>;

export function getSkillsCliPackageForSource(source: string): string | null {
  if (isBareSkillsCliPackage(source)) {
    return source;
  }

  if (source.startsWith("mattpocock:")) {
    return "mattpocock/skills";
  }

  if (getInterfaceCraftInstalledSkillName(source)) {
    return "emilkowalski/skills";
  }

  const githubPrefix = "github:";
  if (!source.startsWith(githubPrefix)) {
    return null;
  }

  const [owner, repo] = source.slice(githubPrefix.length).split("/");
  if (!owner || !repo) {
    return null;
  }

  return `${owner}/${repo}`;
}

export function getSkillsCliPackageForDependency(
  source: string,
  repo: string | undefined,
): string | null {
  return normalizeSkillsCliRepoSource(repo) ?? getSkillsCliPackageForSource(source);
}

export function getSkillsCliSkillNameForSource(source: string): string | null {
  const interfaceCraftSkillName = getInterfaceCraftInstalledSkillName(source);
  if (interfaceCraftSkillName) {
    return interfaceCraftSkillName;
  }

  if (source.startsWith("mattpocock:")) {
    return source.slice("mattpocock:".length).trim() || null;
  }

  const mattPocockGithubPrefix = "github:mattpocock/skills/";
  if (source.startsWith(mattPocockGithubPrefix)) {
    const suffix = source.slice(mattPocockGithubPrefix.length);
    const skillPath = suffix.startsWith("skills/") ? suffix.slice("skills/".length) : suffix;
    return skillPath.trim() || null;
  }

  return null;
}

export async function installExternalSkillDependencyWithSkillsCli(
  input: OmniskillExternalSkillDependencyInstallInput,
): Promise<void> {
  const packageName = getSkillsCliPackageForDependency(input.source, input.repo);
  if (!packageName) {
    throw new Error(`No skills CLI package is known for dependency: ${input.source}`);
  }

  const runCommand = input.runCommand ?? runExternalSkillCommand;
  const env = {
    ...process.env,
    HOME: input.homeDir,
  };
  const materialized = await materializePinnedSkillSource({
    source: packageName,
    cwd: input.homeDir,
    env,
    runCommand,
  });

  try {
    const args = ["--yes", "skills@latest", "add", materialized.sourcePath, "--yes", "--global"];
    if (materialized.copy) {
      args.push("--copy");
    }
    const skillName = getSkillsCliSkillNameForSource(input.source);
    if (skillName) {
      args.push("--skill", skillName, "--agent", "codex");
    }

    const result = await runCommand({
      executable: "npx",
      args,
      cwd: input.homeDir,
      env,
    });

    if (result.stdout.trim()) {
      console.log(result.stdout.trim());
    }
    if (result.stderr.trim()) {
      console.error(result.stderr.trim());
    }
    if (result.exitCode !== 0) {
      throw new Error(
        `skills CLI failed while installing ${packageName} (exit ${result.exitCode})`,
      );
    }
  } finally {
    await materialized.cleanup();
  }
}

function normalizeSkillsCliRepoSource(repo: string | undefined): string | null {
  const trimmed = repo?.trim();
  if (!trimmed) {
    return null;
  }

  const markdownLinkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(trimmed);
  if (!markdownLinkMatch) {
    return trimmed;
  }

  const label = markdownLinkMatch[1]?.trim();
  const url = markdownLinkMatch[2]?.trim();
  if (label && isBareSkillsCliPackage(label)) {
    return label;
  }

  return url || null;
}

function isBareSkillsCliPackage(source: string): boolean {
  return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(source);
}

async function runExternalSkillCommand(
  command: OmniskillExternalSkillCommand,
): Promise<OmniskillExternalSkillCommandResult> {
  return runSubprocess(command);
}
