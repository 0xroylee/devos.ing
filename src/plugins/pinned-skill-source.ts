import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface PinnedGitCommand {
  executable: string;
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
}

export interface PinnedGitCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type PinnedGitCommandRunner = (command: PinnedGitCommand) => Promise<PinnedGitCommandResult>;

export type PinnedGitStage = "initialize" | "configure" | "fetch" | "checkout" | "verify";

export interface MaterializedPinnedGitCheckout {
  checkoutDir: string;
  commit: string;
  cleanup: () => Promise<void>;
}

export interface MaterializedPinnedSkillSource {
  sourcePath: string;
  copy: boolean;
  cleanup: () => Promise<void>;
}

export async function materializePinnedGitCheckout(input: {
  repositoryUrl: string;
  commit: string;
  cwd: string;
  env: Record<string, string | undefined>;
  runCommand: PinnedGitCommandRunner;
  tempDir?: string;
  tempPrefix?: string;
  failureMessage: (stage: PinnedGitStage) => string;
  mismatchMessage: (resolvedCommit: string) => string;
}): Promise<MaterializedPinnedGitCheckout> {
  const tempRoot = await mkdtemp(
    join(input.tempDir ?? tmpdir(), input.tempPrefix ?? "omniskill-pinned-git-"),
  );
  const checkoutDir = join(tempRoot, "checkout");
  const cleanup = () => rm(tempRoot, { recursive: true, force: true });

  try {
    await runRequiredCommand(input, ["init", checkoutDir], input.cwd, "initialize");
    await runRequiredCommand(
      input,
      ["remote", "add", "origin", input.repositoryUrl],
      checkoutDir,
      "configure",
    );
    await runRequiredCommand(
      input,
      ["fetch", "--depth", "1", "origin", input.commit],
      checkoutDir,
      "fetch",
    );
    await runRequiredCommand(
      input,
      ["checkout", "--detach", input.commit],
      checkoutDir,
      "checkout",
    );
    const identity = await runRequiredCommand(input, ["rev-parse", "HEAD"], checkoutDir, "verify");
    const resolvedCommit = identity.stdout.trim();
    if (resolvedCommit !== input.commit) {
      throw new Error(input.mismatchMessage(resolvedCommit));
    }

    return { checkoutDir, commit: resolvedCommit, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function materializePinnedSkillSource(input: {
  source: string;
  cwd: string;
  env: Record<string, string | undefined>;
  runCommand: PinnedGitCommandRunner;
}): Promise<MaterializedPinnedSkillSource> {
  const pinned = parsePinnedGitHubTreeSource(input.source);
  if (!pinned) {
    return { sourcePath: input.source, copy: false, cleanup: async () => {} };
  }

  const materialized = await materializePinnedGitCheckout({
    repositoryUrl: pinned.repositoryUrl,
    commit: pinned.commit,
    cwd: input.cwd,
    env: input.env,
    runCommand: input.runCommand,
    tempPrefix: "omniskill-skill-source-",
    failureMessage: (stage) =>
      `Failed to ${stage} pinned skill source ${input.source}@${pinned.commit}`,
    mismatchMessage: (resolvedCommit) =>
      `Pinned skill source commit mismatch: expected ${pinned.commit}, resolved ${resolvedCommit || "<none>"}`,
  });

  return {
    sourcePath: materialized.checkoutDir,
    copy: true,
    cleanup: materialized.cleanup,
  };
}

async function runRequiredCommand(
  input: {
    env: Record<string, string | undefined>;
    runCommand: PinnedGitCommandRunner;
    failureMessage: (stage: PinnedGitStage) => string;
  },
  args: string[],
  cwd: string,
  stage: PinnedGitStage,
): Promise<PinnedGitCommandResult> {
  const result = await input.runCommand({ executable: "git", args, cwd, env: input.env });
  if (result.exitCode !== 0) {
    const detail = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
    const message = input.failureMessage(stage);
    throw new Error(detail ? `${message}: ${detail}` : message);
  }
  return result;
}

function parsePinnedGitHubTreeSource(
  source: string,
): { repositoryUrl: string; commit: string } | null {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([0-9a-f]{40})\/?$/i.exec(source);
  if (!match) {
    return null;
  }

  const [, owner, repository, commit] = match;
  if (!owner || !repository || !commit) {
    return null;
  }

  return {
    repositoryUrl: `https://github.com/${owner}/${repository.replace(/\.git$/, "")}.git`,
    commit,
  };
}
