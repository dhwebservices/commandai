import { readFileSync } from "node:fs";
import path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { createLogger } from "@comandr/logger";
import { loadAgentGatewayConfig, getEnvVar } from "./config";
import { verifyAgentCertificate } from "./auth-interceptor";
import { createClient } from "@supabase/supabase-js";
import { AgentAuthRepository } from "./agent-auth.repository";
import { EnrollmentService } from "./enrollment.service";
import { signalingCoordinator } from "./signaling-coordinator";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = grpc.loadPackageDefinition(packageDefinition) as any;
  return proto.commandai.agent.v1.AgentChannel;
}

function buildServerCredentials(config: ReturnType<typeof loadAgentGatewayConfig>) {
  if (config.AGENT_GATEWAY_ALLOW_INSECURE) {
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

  // Initialize enrollment service (Supabase-backed)
  const supabase = createClient(
    getEnvVar("SUPABASE_URL"),
    getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
  );
  const authRepo = new AgentAuthRepository(supabase);
  const enrollmentService = new EnrollmentService(authRepo, supabase);

  server.addService(AgentChannel.service, {
    // Enroll: one-time token exchange for new agent registration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Enroll: async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
      const peer = call.getPeer();
      try {
        const { token_id, token_secret } = call.request;

        if (!token_id || !token_secret) {
          throw new Error("token_id and token_secret are required");
        }

        // Extract client certificate (required for enrollment)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cert = (call as any).request.socket?.getPeerCertificate?.();
        if (!cert || !cert.subject) {
          throw new Error("Client certificate required for enrollment");
        }

        // Exchange token for credential
        const result = await enrollmentService.enrollAgent(token_id, token_secret, cert);

        logger.info(
          { agentId: result.agentId, tenantId: result.tenantId, peer },
          "Agent enrolled successfully",
        );

        callback(null, {
          agent_id: result.agentId,
          tenant_id: result.tenantId,
          issued_at: new Date().toISOString(),
          rotates_at: new Date(Date.now() + 30 * 86_400_000).toISOString(), // 30 days
        });
      } catch (err) {
        logger.error({ peer, err }, "Enrollment failed");
        callback(
          {
            code: grpc.status.UNAUTHENTICATED,
            message: (err as Error).message,
          },
          null,
        );
      }
    },
    // StreamIntents: agent subscribes to receive Intent assignments
    streamIntents: async (call: grpc.ServerDuplexStream<unknown, unknown>) => {
      const peer = call.getPeer();
      try {
        let agentIdentity: { agentId: string; tenantId: string };

        if (!config.AGENT_GATEWAY_ALLOW_INSECURE) {
          // Extract client certificate from TLS session
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cert = (call as any).request.socket?.getPeerCertificate?.();
          if (!cert || !cert.subject) {
            throw new Error("No client certificate presented");
          }
          agentIdentity = await verifyAgentCertificate(cert);
          logger.info({ agentId: agentIdentity.agentId, tenantId: agentIdentity.tenantId, peer }, "Agent authenticated for StreamIntents");
        } else {
          // Insecure mode refuses connection (no identity, no auth)
          throw new Error("Insecure mode has no identity to verify — refusing the stream.");
        }

        // TODO: Actual intent streaming logic (subscribe to NATS, filter by tenantId, forward to agent)
        call.on("data", (data) => {
          logger.debug({ agentId: agentIdentity.agentId, data }, "Received data from agent");
        });

        call.on("end", () => {
          logger.info({ agentId: agentIdentity.agentId }, "Agent disconnected from StreamIntents");
          call.end();
        });
      } catch (err) {
        logger.error({ peer, err }, "Rejecting StreamIntents — agent identity not verified");
        call.emit("error", {
          code: grpc.status.UNAUTHENTICATED,
          message: (err as Error).message,
        });
        call.end();
      }
    },
    // StreamStatus: agent sends status updates to cloud
    streamStatus: async (call: grpc.ServerDuplexStream<unknown, unknown>) => {
      const peer = call.getPeer();
      try {
        let agentIdentity: { agentId: string; tenantId: string };

        if (!config.AGENT_GATEWAY_ALLOW_INSECURE) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cert = (call as any).request.socket?.getPeerCertificate?.();
          if (!cert || !cert.subject) {
            throw new Error("No client certificate presented");
          }
          agentIdentity = await verifyAgentCertificate(cert);
          logger.info({ agentId: agentIdentity.agentId, tenantId: agentIdentity.tenantId, peer }, "Agent authenticated for StreamStatus");
        } else {
          throw new Error("Insecure mode has no identity to verify — refusing the stream.");
        }

        // TODO: Actual status handling logic (receive status from agent, publish to NATS)
        call.on("data", (data) => {
          logger.debug({ agentId: agentIdentity.agentId, data }, "Received status update from agent");
        });

        call.on("end", () => {
          logger.info({ agentId: agentIdentity.agentId }, "Agent disconnected from StreamStatus");
          call.end();
        });
      } catch (err) {
        logger.error({ peer, err }, "Rejecting StreamStatus — agent identity not verified");
        call.emit("error", {
          code: grpc.status.UNAUTHENTICATED,
          message: (err as Error).message,
        });
        call.end();
      }
    },
    // StreamRemoteSession: bidirectional WebRTC signaling for remote sessions
    streamRemoteSession: async (call: grpc.ServerDuplexStream<unknown, unknown>) => {
      const peer = call.getPeer();
      try {
        let agentIdentity: { agentId: string; tenantId: string };

        if (!config.AGENT_GATEWAY_ALLOW_INSECURE) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cert = (call as any).request.socket?.getPeerCertificate?.();
          if (!cert || !cert.subject) {
            throw new Error("No client certificate presented");
          }
          agentIdentity = await verifyAgentCertificate(cert);
          logger.info({ agentId: agentIdentity.agentId, tenantId: agentIdentity.tenantId, peer }, "Agent authenticated for StreamRemoteSession");
        } else {
          throw new Error("Insecure mode has no identity to verify — refusing the stream.");
        }

        // Track which sessions this agent is participating in
        const agentSessions = new Set<string>();

        call.on("data", (message: any) => {
          const { session_id, offer, answer, ice_candidate, disconnect } = message;

          if (!session_id) {
            logger.warn({ agentId: agentIdentity.agentId }, "Received message without session_id");
            return;
          }

          const messageType = offer ? 'offer' : answer ? 'answer' : ice_candidate ? 'ice_candidate' : disconnect ? 'disconnect' : 'unknown';

          logger.debug({
            agentId: agentIdentity.agentId,
            sessionId: session_id,
            messageType
          }, "Received WebRTC signaling message");

          // Register participant on first message for this session
          if (!agentSessions.has(session_id)) {
            // Determine role: initiator sends offer first, target sends answer
            const role = offer ? 'initiator' : 'target';
            signalingCoordinator.registerParticipant(
              session_id,
              agentIdentity.agentId,
              agentIdentity.tenantId,
              call,
              role
            );
            agentSessions.add(session_id);
          }

          // Handle disconnect message
          if (disconnect) {
            logger.info({ sessionId: session_id, agentId: agentIdentity.agentId, reason: disconnect.reason }, "Participant disconnecting from session");
            signalingCoordinator.unregisterParticipant(session_id, agentIdentity.agentId);
            agentSessions.delete(session_id);
            return;
          }

          // Relay signaling message to the other participant
          const relayed = signalingCoordinator.relaySignalingMessage(
            session_id,
            agentIdentity.agentId,
            message
          );

          if (!relayed) {
            logger.warn({ sessionId: session_id, agentId: agentIdentity.agentId, messageType }, "Failed to relay signaling message - other participant may not be connected yet");
          }
        });

        call.on("end", () => {
          logger.info({ agentId: agentIdentity.agentId, sessionCount: agentSessions.size }, "Agent disconnected from StreamRemoteSession");
          // Unregister from all sessions
          agentSessions.forEach(sessionId => {
            signalingCoordinator.unregisterParticipant(sessionId, agentIdentity.agentId);
          });
          agentSessions.clear();
          call.end();
        });

        call.on("error", (err) => {
          logger.error({ agentId: agentIdentity.agentId, err }, "StreamRemoteSession error");
          // Cleanup on error
          agentSessions.forEach(sessionId => {
            signalingCoordinator.unregisterParticipant(sessionId, agentIdentity.agentId);
          });
        });
      } catch (err) {
        logger.error({ peer, err }, "Rejecting StreamRemoteSession — agent identity not verified");
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
