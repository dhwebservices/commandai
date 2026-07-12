import { z } from "zod";
import { BaseEnvSchema, SupabaseEnvSchema, ResendEnvSchema, loadConfig } from "@comandr/config";

export const ApiGatewayEnvSchema = BaseEnvSchema.merge(SupabaseEnvSchema)
  .merge(ResendEnvSchema)
  .extend({
    API_GATEWAY_PORT: z.coerce.number().default(3000),
    NATS_URL: z.string().default("nats://localhost:4222"),
    WEB_APP_URL: z.string().default("http://localhost:5173"),
  });
export type ApiGatewayEnv = z.infer<typeof ApiGatewayEnvSchema>;

export function loadApiGatewayConfig(): ApiGatewayEnv {
  return loadConfig(ApiGatewayEnvSchema);
}
