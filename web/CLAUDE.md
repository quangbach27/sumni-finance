# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in `web/`.

## shadcn/ui — do not modify `src/components/ui/`

Files in `src/components/ui/` are shadcn/ui (style `base-nova`, built on `@base-ui/react`, see `components.json`) and must **not** be edited.

- To change look or behavior, wrap or compose the component elsewhere (e.g. `src/components/shared/` or inside a feature) and style via `className` or props.
- To add a new shadcn component, use the CLI (`npx shadcn@latest add <name>`) rather than writing it by hand. Run the npm run format after adding it
- If a change to a `ui/` file seems truly necessary, **stop and ask the user first**, explaining why wrapping isn't enough.

## Commands

`npm run dev` (port 3000), `lint`, `check` (prettier), `format`, `generate-routes`, `storybook` (port 6006), `build`. There is no test runner configured.

## Structure

- `src/routes/` — TanStack Router file-based routes. `routeTree.gen.ts` is generated; don't edit it. Authenticated pages live under `routes/_app/` (layout in `_app/route.tsx`).
- `src/features/<feature>/` — feature code: `api/` (React Query `queryOptions`/mutations + `types.ts`) and `components/`. Routes should stay thin and compose feature components.
- `src/components/layout/` — app shell (sidebar, header, breadcrumb); `src/components/shared/` — reusable app-specific components (with `*.stories.tsx` Storybook stories beside them).
- `src/lib/` — `clients.ts` (axios instance + `ApiError` with `slug`/`status`/`details` mirroring the backend error shape), `query.ts` (QueryClient), `env.ts`, `utils.ts` (`cn`), `currency.ts`.
- Path aliases: `@/*` and `#/*` both map to `src/*`; existing code uses `@/`.

## Conventions

- Forms use react-hook-form with zod (`@hookform/resolvers`). Map backend validation errors (`ApiError.details[].error_slug`) back onto form fields where possible.
- Styling is Tailwind v4 (`src/styles.css`, CSS variables); prettier sorts classes via `prettier-plugin-tailwindcss`. Icons come from `lucide-react`.
- Fund-source API code in `features/fund-sources/api/` is partly mocked (`get-fund-sources.tsx` returns mock data) while the backend endpoint at `/api/v1/fund-sources` is being wired up; its response shape (`uuid`, `balance`, `details` with camelCase bank fields) differs from the mock types in `types.ts`, so check `../api/openapi/ledgers.yml` when integrating.
