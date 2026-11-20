import { useQueryErrorResetBoundary } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import type { ErrorComponentProps } from '@tanstack/react-router';

/** Full-page error state with a retry that also resets failed queries. */
export default function ErrorPage({ error, reset }: ErrorComponentProps) {
  const { reset: resetQueries } = useQueryErrorResetBoundary();
  const { message } = formatApiError(error, 'Đã có lỗi xảy ra.');

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Đã có lỗi xảy ra</h1>
      <p className="text-muted-foreground text-sm">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          resetQueries();
          reset();
        }}
      >
        Thử lại
      </Button>
    </div>
  );
}
