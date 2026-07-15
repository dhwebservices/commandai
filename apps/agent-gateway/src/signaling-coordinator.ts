import * as grpc from "@grpc/grpc-js";
import { createLogger } from "@comandr/logger";

const logger = createLogger("signaling-coordinator");

/**
 * Session participant represents an agent connected to a remote session
 */
interface SessionParticipant {
  agentId: string;
  tenantId: string;
  stream: grpc.ServerDuplexStream<unknown, unknown>;
  role: "initiator" | "target";
  joinedAt: Date;
}

/**
 * SignalingCoordinator manages WebRTC signaling for remote sessions.
 * Routes offers, answers, and ICE candidates between session participants.
 *
 * Phase 2: In-memory implementation for single-instance agent-gateway.
 * Phase 3+: Will be extended to use Redis pub/sub for multi-instance coordination.
 */
export class SignalingCoordinator {
  // Map of sessionId -> participants
  private sessions = new Map<string, SessionParticipant[]>();

  /**
   * Register a participant in a remote session
   */
  registerParticipant(
    sessionId: string,
    agentId: string,
    tenantId: string,
    stream: grpc.ServerDuplexStream<unknown, unknown>,
    role: "initiator" | "target"
  ): void {
    const participant: SessionParticipant = {
      agentId,
      tenantId,
      stream,
      role,
      joinedAt: new Date(),
    };

    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }

    const participants = this.sessions.get(sessionId)!;
    participants.push(participant);

    logger.info({
      sessionId,
      agentId,
      role,
      participantCount: participants.length
    }, "Participant registered for remote session");

    // If both participants are now connected, notify them
    if (participants.length === 2) {
      logger.info({ sessionId }, "Both participants connected - session ready for WebRTC handshake");
    }
  }

  /**
   * Unregister a participant from a remote session
   */
  unregisterParticipant(sessionId: string, agentId: string): void {
    const participants = this.sessions.get(sessionId);
    if (!participants) return;

    const index = participants.findIndex(p => p.agentId === agentId);
    if (index !== -1) {
      participants.splice(index, 1);
      logger.info({ sessionId, agentId, remainingCount: participants.length }, "Participant unregistered");

      // If no participants left, clean up session
      if (participants.length === 0) {
        this.sessions.delete(sessionId);
        logger.info({ sessionId }, "Session cleaned up - no participants remaining");
      }
    }
  }

  /**
   * Relay a signaling message from one participant to the other
   */
  relaySignalingMessage(
    sessionId: string,
    fromAgentId: string,
    message: any
  ): boolean {
    const participants = this.sessions.get(sessionId);
    if (!participants) {
      logger.warn({ sessionId, fromAgentId }, "Cannot relay message - session not found");
      return false;
    }

    // Find the other participant (not the sender)
    const otherParticipant = participants.find(p => p.agentId !== fromAgentId);
    if (!otherParticipant) {
      logger.warn({ sessionId, fromAgentId, participantCount: participants.length }, "Cannot relay message - other participant not found");
      return false;
    }

    try {
      // Forward the message to the other participant
      otherParticipant.stream.write(message);

      const messageType = message.offer ? 'offer' :
                          message.answer ? 'answer' :
                          message.ice_candidate ? 'ice_candidate' :
                          message.disconnect ? 'disconnect' : 'unknown';

      logger.debug({
        sessionId,
        from: fromAgentId,
        to: otherParticipant.agentId,
        messageType
      }, "Relayed signaling message");

      return true;
    } catch (error) {
      logger.error({
        sessionId,
        fromAgentId,
        toAgentId: otherParticipant.agentId,
        error
      }, "Failed to relay signaling message");
      return false;
    }
  }

  /**
   * Get all participants in a session
   */
  getSessionParticipants(sessionId: string): SessionParticipant[] {
    return this.sessions.get(sessionId) || [];
  }

  /**
   * Check if a session has both participants connected
   */
  isSessionReady(sessionId: string): boolean {
    const participants = this.sessions.get(sessionId);
    return participants ? participants.length === 2 : false;
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get all active session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Clean up a session (for timeout or explicit termination)
   */
  cleanupSession(sessionId: string): void {
    const participants = this.sessions.get(sessionId);
    if (participants) {
      // Notify all participants that the session is ending
      participants.forEach(participant => {
        try {
          participant.stream.write({
            session_id: sessionId,
            disconnect: {
              reason: "Session terminated"
            }
          });
          participant.stream.end();
        } catch (error) {
          logger.error({ sessionId, agentId: participant.agentId, error }, "Error notifying participant of session termination");
        }
      });

      this.sessions.delete(sessionId);
      logger.info({ sessionId }, "Session cleaned up and participants notified");
    }
  }
}

// Singleton instance for the agent-gateway
export const signalingCoordinator = new SignalingCoordinator();
