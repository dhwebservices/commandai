#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example"
fi

docker compose -f infra/docker/docker-compose.dev.yml up -d

echo "Waiting for Postgres..."
until docker compose -f infra/docker/docker-compose.dev.yml exec -T postgres pg_isready -U commandai >/dev/null 2>&1; do
  sleep 1
done

echo "Dev stack up: postgres:5432 redis:6379 nats:4222"
echo "Run 'pnpm dev' to start app services."
