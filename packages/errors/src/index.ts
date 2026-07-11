/**
 * Shared error taxonomy. Stable error codes surfaced to clients — never a
 * raw stack trace. PolicyDeniedError must always carry reasoning context
 * for the audit stream (explainability principle).
 */
export abstract class CommandAIError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    public readonly context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toClientResponse() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export class ValidationError extends CommandAIError {
  readonly code = "VALIDATION_ERROR";
  readonly httpStatus = 400;
}

export class PolicyDeniedError extends CommandAIError {
  readonly code = "POLICY_DENIED";
  readonly httpStatus = 403;

  constructor(
    message: string,
    public readonly policyId: string,
    public readonly capabilityId: string,
    context: Record<string, unknown> = {},
  ) {
    super(message, context);
  }

  override toClientResponse() {
    return {
      code: this.code,
      message: this.message,
      reason: this.message, // plain-language explanation, per explainability principle
    };
  }
}

export class CapabilityNotFoundError extends CommandAIError {
  readonly code = "CAPABILITY_NOT_FOUND";
  readonly httpStatus = 404;
}

export class AgentUnreachableError extends CommandAIError {
  readonly code = "AGENT_UNREACHABLE";
  readonly httpStatus = 503;
}

export class InternalError extends CommandAIError {
  readonly code = "INTERNAL_ERROR";
  readonly httpStatus = 500;
}
