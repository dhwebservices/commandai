import { z } from "zod";

export const MatchCommandRequest = z.object({
  query: z.string().min(1),
  tenantId: z.string().uuid(),
});

export type MatchCommandRequest = z.infer<typeof MatchCommandRequest>;

export interface MatchCommandResponse {
  matched: boolean;
  command?: {
    id: string;
    pattern: string;
    description: string;
    capabilityId: string;
    parameters: Record<string, any>;
  };
  suggestions?: string[]; // If no match, suggest similar commands
}
