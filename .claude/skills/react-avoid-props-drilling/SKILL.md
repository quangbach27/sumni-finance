---
name: react-avoid-props-drilling
description: Use when writing or changing React components in web/ that receive a prop only to pass it down, or when a parent passes fetched server data (a period, a list, a record) to children. Prefer passing an id and reading with a query hook, then composition, before context.
---

# Avoid props drilling in web/

## Rule order

1. **Server data: pass the id, not the object.** Child components read what they need with `useQuery` / `useSuspenseQuery` through a thin hook that sits next to the `queryOptions` in `features/<feature>/api/`. React Query dedupes by key and caches, so many readers cost one request, and mutations that call `invalidate...` refresh every reader.
2. **Composition.** If a layer only forwards props, pass `children` or an element/slot from the owner instead (the owner renders `<Child x={x} />` directly).
3. **Narrow props.** Pass the few fields a component uses, not the whole object, when the data is already local state.
4. **Context** only for client/UI state shared by a subtree (see `react-context-state-actions`). Never put server data in context.

Drilling is a smell at 2+ layers that don't use the prop. One level of props is fine.

## Server data hook

```ts
// api/get-ledger-period.ts
export const getLedgerPeriodQueryOptions = (uuid: string) =>
  queryOptions({
    queryKey: [LEDGER_PERIODS_URL, uuid],
    queryFn: ({ signal }) => getLedgerPeriod(uuid, { signal }),
  });

export const useLedgerPeriod = (uuid: string) =>
  useSuspenseQuery(getLedgerPeriodQueryOptions(uuid)).data;
```

```tsx
// Before: every layer takes the whole object
<LedgerPeriodDetailsPage period={period} />   // -> PostEntryStep period -> DeadlineBar period

// After: pass the uuid; each component that needs data reads it
<LedgerPeriodDetailsPage periodUuid={periodUuid} />
const DeadlineBar = ({ periodUuid }: { periodUuid: string }) => {
  const period = useLedgerPeriod(periodUuid);
  ...
};
```

## Notes

- Keep the hook in the same file as `getXQueryOptions`; do not make a new file per hook.
- `useSuspenseQuery` needs a `<Suspense>` boundary above it. The route's boundary covers components under it; lazy steps keep their own.
- A reusable component used outside the feature page (e.g. a button on the overview card) may keep plain value props (`periodUuid`, `periodName`) when it has no query context.
- Mutation hooks stay as they are; they take the id as an argument.
