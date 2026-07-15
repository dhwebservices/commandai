import { Body, Controller, Get, Post, Param, Query } from "@nestjs/common";

interface Intent {
  id: string;
  tenantId: string;
  capabilityId: string;
  parameters: Record<string, any>;
  reasoning: string;
  requestedBy: string;
  createdAt: string;
  status: "pending" | "running" | "completed" | "failed";
}

interface ActionResult {
  intentId: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Simple in-memory intent management for Phase 1.
 * Phase 2 will use proper database storage and NATS streaming.
 */
@Controller({ path: "intents", version: "1" })
export class IntentsSimpleController {
  private intents: Map<string, Intent> = new Map();
  private results: Map<string, ActionResult> = new Map();

  @Post()
  async createIntent(@Body() body: any): Promise<Intent> {
    const intent: Intent = {
      id: crypto.randomUUID(),
      tenantId: body.tenantId,
      capabilityId: body.capabilityId,
      parameters: body.parameters || {},
      reasoning: body.reasoning || "",
      requestedBy: body.requestedBy || "user",
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    this.intents.set(intent.id, intent);

    console.log(`[Intents] Created intent ${intent.id}: ${intent.capabilityId}`);

    return intent;
  }

  @Get("pending")
  async getPendingIntents(@Query("tenantId") tenantId: string): Promise<Intent[]> {
    const pending = Array.from(this.intents.values()).filter(
      (intent) => intent.tenantId === tenantId && intent.status === "pending",
    );

    // Mark them as running so they're not picked up again
    pending.forEach((intent) => {
      intent.status = "running";
      this.intents.set(intent.id, intent);
    });

    return pending;
  }

  @Get(":id")
  async getIntent(@Param("id") id: string): Promise<Intent | null> {
    return this.intents.get(id) || null;
  }

  @Post(":id/result")
  async reportResult(@Param("id") id: string, @Body() result: ActionResult): Promise<void> {
    console.log(`[Intents] Receiving result for ${id}`);
    console.log(`[Intents] Result status:`, result.status);
    console.log(`[Intents] Result keys:`, Object.keys(result));
    console.log(`[Intents] Result.result type:`, typeof result.result);
    console.log(`[Intents] Result.result is array:`, Array.isArray(result.result));
    if (Array.isArray(result.result)) {
      console.log(`[Intents] Result.result length:`, result.result.length);
    }
    console.log(`[Intents] Full result preview:`, JSON.stringify(result).substring(0, 500));

    const intent = this.intents.get(id);
    if (intent) {
      intent.status = result.status;
      this.intents.set(id, intent);
    }

    this.results.set(id, result);

    console.log(`[Intents] Result stored successfully for ${id}`);
  }

  @Get(":id/result")
  async getResult(@Param("id") id: string): Promise<ActionResult | null> {
    return this.results.get(id) || null;
  }

  @Get()
  async listIntents(@Query("tenantId") tenantId?: string): Promise<Intent[]> {
    const intents = Array.from(this.intents.values());
    if (tenantId) {
      return intents.filter((intent) => intent.tenantId === tenantId);
    }
    return intents;
  }
}
