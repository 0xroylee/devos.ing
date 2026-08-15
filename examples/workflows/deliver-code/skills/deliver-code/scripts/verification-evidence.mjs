#!/usr/bin/env node

const DELEGATED_ROLE = "deliver-code";
const DELEGATED_MODEL_ROLE = "implementation";
const DELEGATED_ACCESS = "workspace-write";

function timestamp(value) {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validFingerprint(value) {
  return typeof value === "string" && /^sha256:[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

function validEvidenceId(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function hasUniqueValidIds(values) {
  const ids = values.map((value) => value?.id);
  return ids.every(validEvidenceId) && new Set(ids).size === ids.length;
}

function hasUniqueValidEvidenceIds(command) {
  if (!Array.isArray(command?.requirementIds)) return false;
  return (
    command.requirementIds.every(validEvidenceId) &&
    new Set(command.requirementIds).size === command.requirementIds.length
  );
}

function hasDeclaredRequirementMappings(evidence) {
  const requirementIds = new Set(evidence.requirements.map((requirement) => requirement.id));
  return evidence.commands.every((command) =>
    command.requirementIds.every((requirementId) => requirementIds.has(requirementId)),
  );
}

function validReportShape(evidence) {
  return (
    evidence.schemaVersion === "0.1" &&
    (evidence.mode === "direct" || evidence.mode === "delegated") &&
    typeof evidence.workspacePath === "string" &&
    evidence.workspacePath.trim().length > 0 &&
    timestamp(evidence.changeCompletedAt) !== null &&
    timestamp(evidence.collectedAt) !== null
  );
}

function validCommandShape(command) {
  const exitCodeValid =
    command?.exitCode === null || (Number.isInteger(command?.exitCode) && command.exitCode >= 0);
  return (
    command !== null &&
    typeof command === "object" &&
    typeof command.command === "string" &&
    command.command.trim().length > 0 &&
    timestamp(command.startedAt) !== null &&
    timestamp(command.completedAt) !== null &&
    (command.availability === "available" || command.availability === "unavailable") &&
    exitCodeValid &&
    (command.availability === "unavailable" || command.exitCode !== null) &&
    typeof command.stdout === "string" &&
    typeof command.stderr === "string"
  );
}

function validRequirementShape(requirement) {
  return (
    requirement !== null &&
    typeof requirement === "object" &&
    typeof requirement.text === "string" &&
    requirement.text.trim().length > 0
  );
}

function invalidOutcome() {
  return {
    status: "blocked",
    validationStatus: "invalid",
    commandStatuses: {},
    requirementStatuses: {},
    delegationStatus: "invalid",
  };
}

function commandStatus(evidence, command) {
  if (command.availability !== "available") return "unavailable";
  if (command.exitCode !== 0) return "failed";
  const startedAt = timestamp(command.startedAt);
  const completedAt = timestamp(command.completedAt);
  const changeCompletedAt = timestamp(evidence.changeCompletedAt);
  const collectedAt = timestamp(evidence.collectedAt);
  if (
    startedAt === null ||
    completedAt === null ||
    changeCompletedAt === null ||
    collectedAt === null ||
    startedAt < changeCompletedAt ||
    completedAt < startedAt ||
    completedAt > collectedAt ||
    !validFingerprint(evidence.expectedWorkspaceFingerprint) ||
    !validFingerprint(evidence.workspaceFingerprint) ||
    !validFingerprint(command.workspaceFingerprint) ||
    evidence.workspaceFingerprint !== evidence.expectedWorkspaceFingerprint ||
    command.workspaceFingerprint !== evidence.expectedWorkspaceFingerprint
  ) {
    return "stale";
  }
  return "passed";
}

function delegationStatus(evidence) {
  if (evidence.mode !== "delegated") return "not_applicable";
  const delegation = evidence.delegation;
  if (
    !delegation ||
    typeof delegation.sourceCoordinator !== "string" ||
    delegation.sourceCoordinator.length === 0 ||
    typeof delegation.milestoneId !== "string" ||
    delegation.milestoneId.length === 0 ||
    typeof delegation.agentId !== "string" ||
    delegation.agentId.length === 0 ||
    delegation.role !== DELEGATED_ROLE ||
    delegation.modelRole !== DELEGATED_MODEL_ROLE ||
    delegation.access !== DELEGATED_ACCESS ||
    !Number.isInteger(delegation.candidateIndex) ||
    delegation.candidateIndex < 0 ||
    !Number.isInteger(delegation.candidateCount) ||
    delegation.candidateCount < 1 ||
    delegation.candidateIndex >= delegation.candidateCount
  ) {
    return "invalid";
  }
  return "valid";
}

export async function collectVerificationEvidence(input) {
  const now = input.now ?? (() => new Date().toISOString());
  const commands = [];
  for (const command of input.commands) {
    const startedAt = now();
    let result;
    try {
      result = await input.runner({
        id: command.id,
        command: command.command,
        cwd: input.workspacePath,
      });
    } catch (error) {
      result = {
        availability: "unavailable",
        exitCode: null,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        workspaceFingerprint: null,
      };
    }
    const completedAt = now();
    commands.push({
      ...command,
      startedAt,
      completedAt,
      availability: result.availability,
      exitCode: result.exitCode,
      workspaceFingerprint: result.workspaceFingerprint ?? null,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    });
  }

  return {
    schemaVersion: "0.1",
    mode: input.mode,
    workspacePath: input.workspacePath,
    changeCompletedAt: input.changeCompletedAt,
    expectedWorkspaceFingerprint: input.expectedWorkspaceFingerprint,
    workspaceFingerprint: input.workspaceFingerprint,
    ...(input.delegation ? { delegation: input.delegation } : {}),
    requirements: input.requirements,
    commands,
    collectedAt: now(),
  };
}

export function evaluateVerificationEvidence(evidence) {
  if (
    !evidence ||
    typeof evidence !== "object" ||
    !Array.isArray(evidence.commands) ||
    !Array.isArray(evidence.requirements) ||
    !validReportShape(evidence) ||
    !hasUniqueValidIds(evidence.commands) ||
    !hasUniqueValidIds(evidence.requirements) ||
    evidence.commands.some((command) => !validCommandShape(command)) ||
    evidence.requirements.some((requirement) => !validRequirementShape(requirement)) ||
    evidence.commands.some((command) => !hasUniqueValidEvidenceIds(command)) ||
    !hasDeclaredRequirementMappings(evidence) ||
    delegationStatus(evidence) === "invalid"
  ) {
    return invalidOutcome();
  }
  const commandStatuses = Object.fromEntries(
    evidence.commands.map((command) => [command.id, commandStatus(evidence, command)]),
  );
  const requirementStatuses = Object.fromEntries(
    evidence.requirements.map((requirement) => {
      const mapped = evidence.commands.filter((command) =>
        command.requirementIds.includes(requirement.id),
      );
      const verified =
        mapped.length > 0 && mapped.every((command) => commandStatuses[command.id] === "passed");
      return [requirement.id, verified ? "verified" : "unverified"];
    }),
  );
  const delegatedStatus = delegationStatus(evidence);
  const passed =
    evidence.commands.length > 0 &&
    evidence.requirements.length > 0 &&
    Object.values(commandStatuses).every((status) => status === "passed") &&
    Object.values(requirementStatuses).every((status) => status === "verified") &&
    delegatedStatus !== "invalid";

  return {
    status: passed ? "passed" : "blocked",
    validationStatus: "valid",
    commandStatuses,
    requirementStatuses,
    delegationStatus: delegatedStatus,
  };
}

export function renderVerificationOutcome(outcome) {
  if (outcome.status === "passed") {
    return "Completion verified: every approved requirement is backed by fresh passing command evidence.";
  }
  return "Blocked: verification evidence did not satisfy the approved contract.";
}
