import type { Capability } from "@commandai/schema";

/**
 * Phase 1 in-memory seed. Phase 2: loaded from a real Capability store
 * (Postgres), populated as capabilities are registered by the agent/plugin
 * system. Kept intentionally tiny and explicit for now — see
 * services/policy-engine Architecture.md for how this feeds evaluation.
 */
const REGISTRY: Record<string, Capability> = {
  "system.disk.read_usage": {
    id: "system.disk.read_usage",
    name: "Read Disk Usage",
    description: "Reports disk usage statistics.",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  "system.file.delete": {
    id: "system.file.delete",
    name: "Delete File",
    description: "Deletes a file from disk.",
    riskLevel: "destructive",
    requiresConfirmation: true,
    parameterSchema: { path: "string" },
  },
};

export function findCapability(id: string): Capability | undefined {
  return REGISTRY[id];
}
