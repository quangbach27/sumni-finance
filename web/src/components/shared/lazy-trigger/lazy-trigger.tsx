import { Component, Suspense, lazy, useState } from 'react';

import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';

export interface LazyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface LazyTriggerProps {
  onClick: () => void;
  onPointerEnter: () => void;
  onFocus: () => void;
  'aria-haspopup': 'dialog';
  'aria-expanded': boolean;
}

type Loader<T> = () => Promise<{ default: ComponentType<T> }>;

interface LazyDialogTriggerProps<T extends LazyDialogProps> {
  /** Declare at module level: `const load = () => import('./my-dialog')`. */
  load: Loader<T>;
  /** Extra props forwarded to the dialog (ids, defaults, callbacks...). */
  dialogProps?: Omit<T, keyof LazyDialogProps>;
  children: (triggerProps: LazyTriggerProps) => ReactNode;
}

// One lazy() per loader, created once. After a failed load it is dropped so the
// next click retries (a rejected lazy() stays rejected forever).

const lazyCache = new WeakMap<
  Loader<any>,
  LazyExoticComponent<ComponentType<any>>
>();

function getLazy<T>(load: Loader<T>) {
  let Dialog = lazyCache.get(load);
  if (!Dialog) {
    Dialog = lazy(load);
    lazyCache.set(load, Dialog);
  }
  return Dialog as LazyExoticComponent<ComponentType<T>>;
}

// Without this, a failed chunk load (flaky network, stale deploy) unmounts the app.
class DialogErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export function LazyDialogTrigger<T extends LazyDialogProps>({
  load,
  dialogProps,
  children,
}: LazyDialogTriggerProps<T>) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const prefetch = () => {
    // A failed prefetch shouldn't surface as an unhandled rejection;
    // the error is handled by the boundary when the dialog is actually opened.
    load().catch(() => {});
  };

  const handleLoadError = () => {
    lazyCache.delete(load);
    setOpen(false);
    setMounted(false);
  };

  const Dialog = getLazy(load);
  const props = { ...dialogProps, open, onOpenChange: setOpen } as unknown as T;

  return (
    <>
      {children({
        onClick: () => {
          setMounted(true);
          setOpen(true);
        },
        onPointerEnter: prefetch,
        onFocus: prefetch,
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
      })}
      {mounted && (
        <DialogErrorBoundary onError={handleLoadError}>
          <Suspense fallback={null}>
            <Dialog {...props} />
          </Suspense>
        </DialogErrorBoundary>
      )}
    </>
  );
}
