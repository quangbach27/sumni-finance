---
name: js-naming
description: Use when writing or changing JS/TS in web/ that declares variables, params, object keys, zod schema keys, or form field names. Enforces camelCase for hand-written code; snake_case only for OpenAPI-generated shapes.
---

# JS/TS variable naming in web/

## Rule

- Variables, parameters, functions, hand-written type fields, zod schema keys and react-hook-form field names: **camelCase** (`openDate`, `closeDate`, `fundSourceUuids`).
- **snake_case only** where the shape comes from OpenAPI-generated code (`src/features/generated/*.gen.ts`) or the backend (request/response bodies, query params like `page_size`, error `entity_id`s like `open_date`).

## Boundaries

Convert at the boundary, not throughout the app:

- Form values (camelCase) -> request body (snake_case) in a `toXxxRequest` mapper.
- Backend `entity_id` (snake_case) -> form field (camelCase) via a lookup map (see `ENTITY_TO_FIELD` in `open-ledger-period-form.tsx`).

```ts
// form schema
z.object({ openDate: z.string(), closeDate: z.string() });

// mapper
({ open_date: toIso(values.openDate), close_date: toIso(values.closeDate) });
```

Never hand-edit generated files.
