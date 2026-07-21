import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface PinnedSkillSourceCommand {
  executable: string;
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
}

export interface PinnedSkillSourceCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type PinnedSkillSourceCommandRunner = (
  command: PinnedSkillSourceCommand,
) => Promise<PinnedSkillSourceCommandResult>;

export interface MaterializedPinnedSkillSource {
  sourcePath: string;
  copy: boolean;
  cleanup: () => Promise<void>;
}

export async function materializePinnedSkillSource(input: {
  source: string;
  cwd: string;
  env: Record<string, string | undefined>;
  runCommand: PinnedSkillSourceCommandRunner;
}): Promise<MaterializedPinnedSkillSource> {
  const pinned = parsePinnedGitHubTreeSource(input.source);
  if (!pinned) {
    return { sourcePath: input.source, copy: false, cleanup: async () => {} };
  }

  const sourcePath = await mkdtemp(join(tmpdir(), "omniskill-skill-source-"));
  const cleanup = () => rm(sourcePath, { recursive: true, force: true });

  try {
    await runRequiredCommand(
      input,
      ["-C", sourcePath, "init"],
      `Failed to initialize pinned skill source ${input.source}`,
    );
    await runRequiredCommand(
      input,
      ["-C", sourcePath, "remote", "add", "origin", pinned.repositoryUrl],
      `Failed to configure pinned skill source ${input.source}`,
    );
    await runRequiredCommand(
      input,
      ["-C", sourcePath, "fetch", "--depth", "1", "origin", pinned.commit],
      `Failed to fetch pinned skill source ${input.source}@${pinned.commit}`,
    );
    await runRequiredCommand(
      input,
      ["-C", sourcePath, "checkout", "--detach", "FETCH_HEAD"],
      `Failed to checkout pinned skill source ${input.source}@${pinned.commit}`,
    );
    const identity = await runRequiredCommand(
      input,
      ["-C", sourcePath, "rev-parse", "HEAD"],
      `Failed to verify pinned skill source ${input.source}@${pinned.commit}`,
    );
    const resolvedCommit = identity.stdout.trim();
    if (resolvedCommit !== pinned.commit) {
      throw new Error(
        `Pinned skill source commit mismatch: expected ${pinned.commit}, resolved ${resolvedCommit || "<none>"}`,
      );
    }

    return { sourcePath, copy: true, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function runRequiredCommand(
  input: {
    cwd: string;
    env: Record<string, string | undefined>;
    runCommand: PinnedSkillSourceCommandRunner;
  },
  args: string[],
  failureMessage: string,
): Promise<PinnedSkillSourceCommandResult> {
  const result = await input.runCommand({
    executable: "git",
    args,
    cwd: input.cwd,
    env: input.env,
  });
  if (result.exitCode !== 0) {
    const detail = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
    throw new Error(detail ? `${failureMessage}: ${detail}` : failureMessage);
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
