import { Body, Controller, Post } from "@nestjs/common";
import { CommandsService } from "./commands.service";
import { MatchCommandRequest } from "./commands.dto";
import { loadApiGatewayConfig } from "../../config";
import { createSupabaseAdminClient } from "../auth/supabase-admin.client";

@Controller({ path: "commands", version: "1" })
export class CommandsController {
  private readonly commandsService: CommandsService;

  constructor() {
    const config = loadApiGatewayConfig();
    const supabase = createSupabaseAdminClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
    this.commandsService = new CommandsService(supabase);
  }

  @Post("match")
  async matchCommand(@Body() body: unknown) {
    const { query, tenantId } = MatchCommandRequest.parse(body);
    return this.commandsService.matchCommand(query, tenantId);
  }
}
