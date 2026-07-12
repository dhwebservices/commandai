# Production-ready Dockerfile for Comandr API Gateway
FROM node:22-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./
COPY tsconfig.base.json ./

# Copy all workspace packages
COPY apps/api-gateway ./apps/api-gateway
COPY packages ./packages
COPY services ./services

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm build

# Production stage
FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace structure
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-workspace.yaml ./
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/tsconfig.base.json ./

# Copy built app
COPY --from=base /app/apps/api-gateway ./apps/api-gateway

# Copy all packages (needed for workspace dependencies)
COPY --from=base /app/packages ./packages
COPY --from=base /app/services ./services

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Set environment
ENV NODE_ENV=production
ENV API_GATEWAY_PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start command
CMD ["node", "apps/api-gateway/dist/main.js"]
