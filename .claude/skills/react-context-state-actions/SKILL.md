---
name: react-context-state-actions
description: Use when creating or changing a React context in web/ that holds client/UI state (wizard step, dialog, alert, selection) shared by a subtree. Split state and actions into two contexts so action-only consumers do not re-render.
---

# React context with separate state and actions

Use context only for **client/UI state** shared across a subtree. Server data belongs in React Query (see `react-avoid-props-drilling`).

## Rule

- Two contexts: `XStateContext` (changing values) and `XActionsContext` (functions).
- Actions have **stable identity**: `useCallback`, or refs for values they read, so components that only call actions never re-render on state change.
- Memoize both context values with `useMemo`.
- Provider is colocated in `x-context.tsx` / `x-provider.tsx` and owns the state.
- Consumers use hooks, never `useContext` directly: `useXState()` and `useXActions()`. They throw outside the provider.
- Sentinel for "no provider": `null` (or `undefined` when `null` is a valid state value). Add `useOptionalXActions()` returning `null` when a component works both inside and outside the provider.
- Keep contexts small and per concern; do not create a catch-all store.

## Skeleton

```tsx
const XStateContext = createContext<XState | null>(null);
const XActionsContext = createContext<XActions | null>(null);

export function XProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const actions = useMemo<XActions>(
    () => ({ show: () => setOpen(true), hide: () => setOpen(false) }),
    [],
  );
  const state = useMemo<XState>(() => ({ open }), [open]);

  return (
    <XActionsContext.Provider value={actions}>
      <XStateContext.Provider value={state}>{children}</XStateContext.Provider>
    </XActionsContext.Provider>
  );
}

export function useXState() {
  const value = useContext(XStateContext);
  if (!value) throw new Error('useXState must be used within XProvider');
  return value;
}

export function useXActions() {
  const value = useContext(XActionsContext);
  if (!value) throw new Error('useXActions must be used within XProvider');
  return value;
}
```

## Examples in this repo

- `src/components/shared/step-flow/step-flow-context.tsx`: `StepFlowStateContext` / `StepFlowActionsContext`, refs for stable actions, `useOptionalStepFlowActions`.
- `src/components/shared/status-alert/status-alert-provider.tsx`: same split, `undefined` sentinel because `null` is a valid state.

## Don't

- Put fetched/server data in context.
- Pass a new object/function literal as a provider value on each render.
- Use context for something only one level down (use props).
