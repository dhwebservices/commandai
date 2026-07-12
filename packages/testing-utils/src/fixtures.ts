import type { Capability } from "@comandr/schema";

/**
 * Seed fixtures for local dev + tests. Deliberately includes a home user and
 * an MSP-with-sub-tenants shape so every environment exercises the
 * multi-tenancy path from day one.
 */
export const FIXTURE_TENANTS = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Home User - Alice", type: "home" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Home User - Bob", type: "home" },
  { id: "33333333-3333-3333-3333-333333333333", name: "Acme MSP", type: "msp" },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Acme MSP - Client A",
    type: "msp_client",
    parentTenantId: "33333333-3333-3333-3333-333333333333",
  },
] as const;

export const MOCK_CAPABILITY_REGISTRY: Capability[] = [
  {
    id: "system.disk.read_usage",
    name: "Read Disk Usage",
    description: "Reports disk usage statistics.",
    riskLevel: "read",
    requiresConfirmation: false,
    parameterSchema: {},
  },
  {
    id: "system.file.delete",
    name: "Delete File",
    description: "Deletes a file from disk.",
    riskLevel: "destructive",
    requiresConfirmation: true,
    parameterSchema: { path: "string" },
  },
];
