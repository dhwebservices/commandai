import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchCommandResponse } from "./commands.dto";

export class CommandsService {
  constructor(private readonly supabase: SupabaseClient) {}

  async matchCommand(query: string, tenantId: string): Promise<MatchCommandResponse> {
    const queryLower = query.toLowerCase().trim();

    // Search for commands in order:
    // 1. Exact pattern match (tenant-specific)
    // 2. Exact pattern match (global)
    // 3. Alias match (tenant-specific)
    // 4. Alias match (global)
    // 5. Fuzzy pattern match

    // Fetch all active commands for this tenant (includes global + tenant-specific)
    const { data: commands, error } = await this.supabase
      .from("commands")
      .select("id, pattern, aliases, description, capability_id, parameters")
      .eq("is_active", true)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order("tenant_id", { ascending: false }); // Tenant-specific first

    if (error || !commands) {
      console.error("[Commands] Failed to fetch commands:", error);
      return { matched: false, suggestions: [] };
    }

    // 1. Exact pattern match
    for (const cmd of commands) {
      if (cmd.pattern.toLowerCase() === queryLower) {
        return {
          matched: true,
          command: {
            id: cmd.id,
            pattern: cmd.pattern,
            description: cmd.description,
            capabilityId: cmd.capability_id,
            parameters: cmd.parameters || {},
          },
        };
      }
    }

    // 2. Alias match
    for (const cmd of commands) {
      if (cmd.aliases && cmd.aliases.some((alias: string) => alias.toLowerCase() === queryLower)) {
        return {
          matched: true,
          command: {
            id: cmd.id,
            pattern: cmd.pattern,
            description: cmd.description,
            capabilityId: cmd.capability_id,
            parameters: cmd.parameters || {},
          },
        };
      }
    }

    // 3. Fuzzy/contains match
    for (const cmd of commands) {
      if (cmd.pattern.toLowerCase().includes(queryLower) || queryLower.includes(cmd.pattern.toLowerCase())) {
        return {
          matched: true,
          command: {
            id: cmd.id,
            pattern: cmd.pattern,
            description: cmd.description,
            capabilityId: cmd.capability_id,
            parameters: cmd.parameters || {},
          },
        };
      }
    }

    // 4. Check if any alias contains the query
    for (const cmd of commands) {
      if (cmd.aliases && cmd.aliases.some((alias: string) =>
        alias.toLowerCase().includes(queryLower) || queryLower.includes(alias.toLowerCase())
      )) {
        return {
          matched: true,
          command: {
            id: cmd.id,
            pattern: cmd.pattern,
            description: cmd.description,
            capabilityId: cmd.capability_id,
            parameters: cmd.parameters || {},
          },
        };
      }
    }

    // No match - return suggestions
    const suggestions = commands
      .slice(0, 5)
      .map(cmd => cmd.pattern);

    return {
      matched: false,
      suggestions,
    };
  }
}
