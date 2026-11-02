import { Suspense, lazy, useState } from 'react';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useIsMobile } from '@/hooks/use-mobile';

const loadDialog = () => import('./create-fund-source-dialog');
const CreateFundSourceDialog = lazy(loadDialog);

export default function CreateFundSourceTrigger() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const prefetchDialog = () => {
    // A failed prefetch shouldn't surface as an unhandled rejection;
    // lazy() will retry and report the error when the dialog is actually opened.
    loadDialog().catch(() => {});
  };

  return (
    <>
      <Button
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        onPointerEnter={prefetchDialog}
        onFocus={prefetchDialog}
      >
        <Plus data-icon="inline-start" />
        <span>{isMobile ? 'Thêm' : 'Thêm nguồn quỹ'}</span>
      </Button>
      {mounted && (
        <Suspense fallback={null}>
          <CreateFundSourceDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
