import { Suspense, lazy, useState } from 'react';

import { Button } from '@/components/ui/button';

import type { ComponentProps } from 'react';

const loadDialog = () => import('./open-ledger-period-dialog');
const OpenLedgerPeriodDialog = lazy(loadDialog);

type OpenLedgerPeriodTriggerProps = Omit<
  ComponentProps<typeof Button>,
  'onClick'
>;

/** Button content (icon + label) is passed as `children`. */
export default function OpenLedgerPeriodTrigger({
  children,
  ...props
}: OpenLedgerPeriodTriggerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const prefetchDialog = () => {
    loadDialog().catch(() => {});
  };

  return (
    <>
      <Button
        {...props}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        onPointerEnter={prefetchDialog}
        onFocus={prefetchDialog}
      >
        {children}
      </Button>
      {mounted && (
        <Suspense fallback={null}>
          <OpenLedgerPeriodDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
