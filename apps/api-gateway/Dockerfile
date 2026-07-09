FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @commandai/api-gateway build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/apps/api-gateway/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
