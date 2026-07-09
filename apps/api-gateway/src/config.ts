import { z } from "zod";
import { BaseEnvSchema, loadConfig } from "@commandai/config";

export const ApiGatewayEnvSchema = BaseEnvSchema.extend({
  API_GATEWAY_PORT: z.coerce.number().default(3000),
});
export type ApiGatewayEnv = z.infer<typeof ApiGatewayEnvSchema>;

export function loadApiGatewayConfig(): ApiGatewayEnv {
  return loadConfig(ApiGatewayEnvSchema);
}
