import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { CommandAIError, InternalError } from "@comandr/errors";

/**
 * Every error either recovers, surfaces to the user, or is logged with
 * context — never swallowed (Architecture Principle #6). No raw stack
 * trace ever reaches the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof CommandAIError) {
      response.status(exception.httpStatus).json(exception.toClientResponse());
      return;
    }

    // eslint-disable-next-line no-console
    console.error("Unhandled error", exception);
    const fallback = new InternalError("An unexpected error occurred.");
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(fallback.toClientResponse());
  }
}
