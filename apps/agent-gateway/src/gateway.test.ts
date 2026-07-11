import { describe, it, expect, beforeEach } from "vitest";
import { loadAgentGatewayConfig } from "./config";
import { verifyAgentCertificate } from "./auth-interceptor";

describe("loadAgentGatewayConfig", () => {
  beforeEach(() => {
    delete process.env.TLS_CERT_PATH;
    delete process.env.TLS_KEY_PATH;
    delete process.env.TLS_CA_CERT_PATH;
    delete process.env.AGENT_GATEWAY_ALLOW_INSECURE;
    process.env.NODE_ENV = "test";
  });

  it("fails fast when TLS paths are missing and insecure flag is not set", () => {
    expect(() => loadAgentGatewayConfig()).toThrow(/TLS_CERT_PATH/);
  });

  it("allows missing TLS paths only when AGENT_GATEWAY_ALLOW_INSECURE=true", () => {
    process.env.AGENT_GATEWAY_ALLOW_INSECURE = "true";
    const config = loadAgentGatewayConfig();
    expect(config.AGENT_GATEWAY_ALLOW_INSECURE).toBe(true);
  });
});

describe("verifyAgentCertificate", () => {
  it("throws when certificate fingerprint cannot be extracted", async () => {
    // Empty cert object has no fingerprint256 or raw field
    await expect(verifyAgentCertificate({} as any)).rejects.toThrow("Cannot extract certificate fingerprint");
  });

  it("throws when SUPABASE_URL is not set", async () => {
    delete process.env.SUPABASE_URL;
    const mockCert = { fingerprint256: "AA:BB:CC", subject: {} } as any;
    await expect(verifyAgentCertificate(mockCert)).rejects.toThrow("SUPABASE_URL");
  });
});
