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
  it("always throws — this is the RFC-001 security-review gate, not yet implemented", () => {
    expect(() => verifyAgentCertificate({} as any)).toThrow(/not yet implemented/);
  });
});
