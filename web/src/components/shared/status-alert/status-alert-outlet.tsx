import { useEffect, useRef } from 'react';

import StatusAlert from './status-alert';
import { useStatusAlert } from './status-alert-provider';

/** Renders the provider's current status here (nothing when there is none). */
export default function StatusAlertOutlet({
  className,
}: {
  className?: string;
}) {
  const { status, dismissAlert } = useStatusAlert();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [status]);

  if (!status) return null;

  return (
    <StatusAlert
      ref={ref}
      variant={status.variant}
      title={status.title}
      onDismiss={dismissAlert}
      className={className}
    >
      {status.message}
      {status.details && status.details.length > 0 && (
        <ul className="mt-1 list-disc pl-4">
          {status.details.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </StatusAlert>
  );
}
