import { createContext, useContext, useMemo, useState } from 'react';

import type { ReactNode } from 'react';

export type StatusAlertData = {
  variant: 'success' | 'destructive';
  title: string;
  message?: ReactNode;
  /** One line per detail, shown as a bulleted list. */
  details?: string[];
};

type StatusAlertContextValue = {
  status: StatusAlertData | null;
  showAlert: (status: StatusAlertData) => void;
  dismissAlert: () => void;
};

const StatusAlertContext = createContext<StatusAlertContextValue | null>(null);

/** Holds the status data; render it where needed with `<StatusAlertOutlet />`. Mount one per feature. */
export function StatusAlertProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StatusAlertData | null>(null);

  const value = useMemo(
    () => ({
      status,
      showAlert: setStatus,
      dismissAlert: () => setStatus(null),
    }),
    [status],
  );

  return (
    <StatusAlertContext.Provider value={value}>
      {children}
    </StatusAlertContext.Provider>
  );
}

export function useStatusAlert() {
  const ctx = useContext(StatusAlertContext);
  if (!ctx) {
    throw new Error('useStatusAlert must be used inside <StatusAlertProvider>');
  }
  return ctx;
}
