import { Controller, Get } from "@nestjs/common";

/**
 * Every API is versioned from its first release — Non-Negotiable #4.
 * Route prefix carries /v1 even for this first, trivial endpoint.
 */
@Controller({ path: "health", version: "1" })
export class HealthController {
  @Get()
  check() {
    return { status: "ok", service: "api-gateway", version: "v1" };
  }
}
