/**
 * Cloudflare Workers entry point for Comandr API
 * Adapts NestJS app to run on Cloudflare's edge network
 */

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { VersioningType } from "@nestjs/common";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";

// Cache the NestJS app instance
let app: any = null;

async function getApp() {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log"],
    });

    app.enableCors();
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  }
  return app;
}

// Cloudflare Workers fetch handler
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      // Set environment variables from Cloudflare Workers env
      process.env.SUPABASE_URL = env.SUPABASE_URL;
      process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.RESEND_API_KEY = env.RESEND_API_KEY;
      process.env.RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL;
      process.env.WEB_APP_URL = env.WEB_APP_URL || "https://commandai.pages.dev";
      process.env.NODE_ENV = env.NODE_ENV || "production";
      process.env.LOG_LEVEL = env.LOG_LEVEL || "info";

      const nestApp = await getApp();

      // Convert Cloudflare Request to Node.js compatible request
      const url = new URL(request.url);
      const body = request.method !== "GET" && request.method !== "HEAD"
        ? await request.text()
        : undefined;

      // Forward to NestJS
      const response = await nestApp.getHttpAdapter().getInstance().handle({
        method: request.method,
        url: url.pathname + url.search,
        headers: Object.fromEntries(request.headers),
        body,
      });

      // Convert NestJS response to Cloudflare Response
      return new Response(JSON.stringify(response.body || response), {
        status: response.statusCode || response.status || 200,
        headers: {
          "Content-Type": "application/json",
          ...response.headers,
        },
      });
    } catch (error: any) {
      console.error("[Worker] Error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
