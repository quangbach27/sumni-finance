# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

- `backend/` — Go modular monolith. See `backend/CLAUDE.md` (architecture) and `backend/internal/<module>/domain/CLAUDE.md` (business logic).
- `web/` — React frontend (Vite, TanStack Router/Query, Tailwind, Storybook). `#/*` aliases `src/*`.
- `api/openapi/` — OpenAPI specs; source of truth for HTTP contracts. Backend code is generated from them.

## Commands

Root `Makefile`: `make up` (docker compose: backend on :4000 with live reload + Postgres), `make down`, `make down-clean` (also wipes DB volume), `make web` (Vite on :3000).

Backend (from `backend/`):
- `make gen` — sqlc + oapi-codegen; rerun after changing specs, SQL queries or migrations.
- `make lint`, `make fmt`
- `make test-unit`, `make test-integration`, `make test-component` (integration/component need Postgres and load `.env.test`).
- Single test: `set -a; . ./.env.test; set +a; go test -race -tags integration ./internal/ledgers/adapters/db -run TestName -count=1`

Web (from `web/`): `npm run lint`, `npm run check`, `npm run format`, `npm run generate-routes`, `npm run storybook`.

Never hand-edit generated files (`*.gen.go`, `dbmodels/`, `routeTree.gen.ts`).
