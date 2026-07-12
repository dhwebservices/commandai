/**
 * Security Middleware - Sets security headers for all responses
 * Protects against common web vulnerabilities
 */

import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");

    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Enable XSS filter (legacy browsers)
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Force HTTPS
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    // Control referrer information
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions Policy (formerly Feature-Policy)
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=()"
    );

    next();
  }
}
