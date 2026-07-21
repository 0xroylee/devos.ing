import { describe, expect, test } from "bun:test";
import { stat } from "node:fs/promises";
import { materializePinnedSkillSource } from "../src/plugins/pinned-skill-source";

const pinnedSource =
  "https://github.com/mattpocock/skills/tree/d574778f94cf620fcc8ce741584093bc650a61d3";

describe("pinned skill source materializer", () => {
  test("verifies the detached checkout identity", async () => {
    const commands: string[][] = [];
    const materialized = await materializePinnedSkillSource({
      source: pinnedSource,
      cwd: "/tmp",
      env: {},
      runCommand: async (command) => {
        commands.push(command.args);
        return {
          stdout: command.args.includes("rev-parse")
            ? "d574778f94cf620fcc8ce741584093bc650a61d3\n"
            : "",
          stderr: "",
          exitCode: 0,
        };
      },
    });

    expect(commands.at(-1)).toEqual(["-C", materialized.sourcePath, "rev-parse", "HEAD"]);
    expect(materialized.copy).toBe(true);
    await materialized.cleanup();
    await expect(stat(materialized.sourcePath)).rejects.toThrow();
  });

  test("stops after fetch failure, reports the command, and cleans the checkout", async () => {
    const commands: string[][] = [];
    let sourcePath = "";

    await expect(
      materializePinnedSkillSource({
        source: pinnedSource,
        cwd: "/tmp",
        env: {},
        runCommand: async (command) => {
          commands.push(command.args);
          sourcePath = command.args[1] ?? sourcePath;
          if (command.args.includes("fetch")) {
            return { stdout: "", stderr: "remote rejected commit", exitCode: 128 };
          }
          return { stdout: "", stderr: "", exitCode: 0 };
        },
      }),
    ).rejects.toThrow("Failed to fetch pinned skill source");

    expect(commands).toHaveLength(3);
    expect(commands.at(-1)).toContain("fetch");
    await expect(stat(sourcePath)).rejects.toThrow();
  });
});
