import { readFileSync } from "node:fs";
import path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { createLogger } from "@commandai/logger";
import { loadAgentGatewayConfig } from "./config";
import { verifyAgentCertificate } from "./auth-interceptor";

const PROTO_PATH = path.join(__dirname, "../../../packages/proto/agent/v1/agent.proto");

/**
 * ADR-010: uses @grpc/proto-loader to load the .proto directly at
 * runtime rather than generated stubs — avoids depending on buf's remote
 * codegen plugins (not reachable without network access at build time in
 * the environment this was built in). Functionally equivalent; codegen
 * can replace this later as a build-time optimization only.
 */
function loadAgentChannelDefinition() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition) as any;
  return proto.commandai.agent.v1.AgentChannel;
}

function buildServerCredentials(config: ReturnType<typeof loadAgentGatewayConfig>) {
  if (config.AGENT_GATEWAY_ALLOW_INSECURE) {
    // eslint-disable-next-line no-console
    console.warn(
      "*** AGENT_GATEWAY_ALLOW_INSECURE=true — this gateway is accepting UNAUTHENTICATED " +
        "plaintext connections. This must NEVER be set outside local dev (ADR-010). ***",
    );
    return grpc.ServerCredentials.createInsecure();
  }

  const rootCert = readFileSync(config.TLS_CA_CERT_PATH!);
  const cert = readFileSync(config.TLS_CERT_PATH!);
  const key = readFileSync(config.TLS_KEY_PATH!);

  return grpc.ServerCredentials.createSsl(
    rootCert,
    [{ private_key: key, cert_chain: cert }],
    true, // requireClientCert — mTLS, not just server-side TLS
  );
}

export function startServer() {
  const config = loadAgentGatewayConfig(); // fails fast on missing TLS config
  const logger = createLogger("agent-gateway", config.LOG_LEVEL);
  const AgentChannel = loadAgentChannelDefinition();

  const server = new grpc.Server();

  server.addService(AgentChannel.service, {
    // Both handlers explicitly refuse until verifyAgentCertificate is
    // implemented (ADR-010) — this is not a placeholder that quietly
    // accepts connections, it hard-fails every call.
    streamIntents: (call: grpc.ServerDuplexStream<unknown, unknown>) => {
      const peer = call.getPeer();
      try {
        if (!config.AGENT_GATEWAY_ALLOW_INSECURE) {
          verifyAgentCertificate({} as any); // throws — see auth-interceptor.ts
        } else {
          throw new Error("Insecure mode has no identity to verify — refusing the stream.");
        }
      } catch (err) {
        logger.error({ peer, err }, "Rejecting StreamIntents — agent identity not verified");
        call.emit("error", {
          code: grpc.status.UNAUTHENTICATED,
          message: (err as Error).message,
        });
        call.end();
      }
    },
    streamStatus: (call: grpc.ServerDuplexStream<unknown, unknown>) => {
      const peer = call.getPeer();
      try {
        if (!config.AGENT_GATEWAY_ALLOW_INSECURE) {
          verifyAgentCertificate({} as any);
        } else {
          throw new Error("Insecure mode has no identity to verify — refusing the stream.");
        }
      } catch (err) {
        logger.error({ peer, err }, "Rejecting StreamStatus — agent identity not verified");
        call.emit("error", {
          code: grpc.status.UNAUTHENTICATED,
          message: (err as Error).message,
        });
        call.end();
      }
    },
  });

  const credentials = buildServerCredentials(config);
  server.bindAsync(`0.0.0.0:${config.AGENT_GATEWAY_PORT}`, credentials, (err, port) => {
    if (err) {
      logger.error({ err }, "Failed to bind agent-gateway");
      process.exit(1);
    }
    logger.info(
      { port, mtls: !config.AGENT_GATEWAY_ALLOW_INSECURE },
      "agent-gateway listening — NOTE: no real agent can complete a call yet (ADR-010, auth-interceptor unimplemented)",
    );
  });

  return server;
}

if (require.main === module) {
  startServer();
}
