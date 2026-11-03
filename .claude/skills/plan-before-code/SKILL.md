---
name: plan-before-code
description: Use before writing or changing any code in this repo (new feature, endpoint, command, query, migration, component, hook, form). Ensures you understand the business logic and check for reusable code first, then think through the design before generating anything.
---

# Plan before code

Do these in order. Do not write new code until step 3.

## 1. Understand the business logic

- Read the relavent docs to understand the requirement and business logic.
- If a rule is unclear or missing, ask the user instead of guessing.

## 2. Check what can be reused

- Backend: domain aggregates/factories and their validation, existing commands/queries, sqlc queries, `internal/shared`, generated clients and types.
- Web: `src/components/shared/`, `src/features/<feature>/`, `src/lib/`, `src/hooks/`, existing `src/components/ui/` components (see the `shadcn-ui` skill).

## 3. Think, then generate

- Briefly decide: what is reused, what is genuinely new, and where it belongs (follow the layering rules in `backend/CLAUDE.md` and the structure in `web/CLAUDE.md`).
- Then write the minimum new code needed.
