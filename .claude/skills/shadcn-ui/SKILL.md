---
name: shadcn-ui
description: Use when building or changing UI in web/ with shadcn/ui components (buttons, dialogs, forms, fields, selects, sidebars, etc.), adding a new shadcn component, or when a change seems to require touching web/src/components/ui/.
---

# shadcn/ui in web/

See `web/CLAUDE.md` for the overall frontend structure.

Follow the `plan-before-code` skill first.

## Hard rule: do not edit `web/src/components/ui/`

- Never modify files in `src/components/ui/`.
- Customize by wrapping/composing in `src/components/shared/` or inside the feature folder, and by passing `className` / props.
- If a `ui/` edit seems truly necessary, **stop and ask the user first**, explaining why wrapping isn't enough.

## Setup facts

- Style `base-nova`, built on `@base-ui/react` (not Radix). Do not assume Radix APIs such as `asChild`; read the component in `ui/` to see its actual props (e.g. Base UI's `render` prop) before using it.
- Config is `web/components.json`. Icons: `lucide-react`. Variants: `cva` (`class-variance-authority`).
- Add a new component with `npx shadcn@latest add <name>` from `web/`, never by hand-writing it. Check `ui/` first — it may already exist.

## shadcn MCP (`web/.mcp.json`)

Use the shadcn MCP tools (`search_items_in_registries`, `view_items_in_registries`, `get_item_examples_from_registries`) to look up component APIs and examples before using them. They only read; add components via the CLI command from `get_add_command_for_items`, and never edit `ui/`.

## Using components

- Forms: `Field`, `FieldGroup`, `FieldLabel`, `FieldDescription`, `FieldError` with react-hook-form `Controller` and zod. Reference: `src/features/fund-sources/components/create-fund-source-form.tsx`.
- Use semantic Tailwind tokens (`bg-primary`, `text-muted-foreground`, `border-border`, `text-destructive`), not raw colors, so dark mode and theming work.
- Merge classes with the `cn` helper from `@/lib/utils`.
- App-specific compositions of shadcn parts go in `components/shared/<name>/` with a `*.stories.tsx` beside them, or in `features/<feature>/components/`.
