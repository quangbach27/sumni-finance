import { createContext, useContext, useMemo, useState } from 'react';

import type { ReactNode } from 'react';

export type StatusAlertData = {
  variant: 'success' | 'destructive';
  title: string;
  message?: ReactNode;
  /** One line per detail, shown as a bulleted list. */
  details?: string[];
};

type StatusAlertActions = {
  showAlert: (status: StatusAlertData) => void;
  dismissAlert: () => void;
};

// State and actions live in separate contexts so consumers that only trigger
// alerts don't re-render every time the alert shows or hides.
const StatusAlertStateContext = createContext<
  StatusAlertData | null | undefined
>(undefined);
const StatusAlertActionsContext = createContext<StatusAlertActions | null>(
  null,
);

/** Holds the status data; render it where needed with `<StatusAlertOutlet />`. Mount one per feature. */
export function StatusAlertProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StatusAlertData | null>(null);

  const actions = useMemo<StatusAlertActions>(
    () => ({
      showAlert: setStatus,
      dismissAlert: () => setStatus(null),
    }),
    [],
  );

  return (
    <StatusAlertActionsContext.Provider value={actions}>
      <StatusAlertStateContext.Provider value={status}>
        {children}
      </StatusAlertStateContext.Provider>
    </StatusAlertActionsContext.Provider>
  );
}

/** Stable `showAlert`/`dismissAlert`; does not re-render when the alert changes. */
export function useStatusAlertActions() {
  const ctx = useContext(StatusAlertActionsContext);
  if (!ctx) {
    throw new Error(
      'useStatusAlertActions must be used inside <StatusAlertProvider>',
    );
  }
  return ctx;
}

/** Current status plus actions; re-renders when the alert changes. */
export function useStatusAlert() {
  const actions = useStatusAlertActions();
  const status = useContext(StatusAlertStateContext);
  if (status === undefined) {
    throw new Error('useStatusAlert must be used inside <StatusAlertProvider>');
  }
  return { status, ...actions };
}
