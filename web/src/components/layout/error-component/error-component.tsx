import { useQueryErrorResetBoundary } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';

import ContentLayout from '@/components/layout/content-layout/content-layout';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

type ErrorComponentProps = {
  error: unknown;
  reset: () => void;
  /** Title of the page the error replaces. */
  title: string;
  /** Message shown when the error carries none of its own. */
  fallbackMessage: string;
};

/** Route error state with a retry button that also resets failed queries. */
export default function ErrorComponent({
  error,
  reset,
  title,
  fallbackMessage,
}: ErrorComponentProps) {
  const { reset: resetQueries } = useQueryErrorResetBoundary();
  const { message } = formatApiError(error, fallbackMessage);

  return (
    <ContentLayout title={title}>
      <div className="mt-4 flex flex-col items-center gap-2 p-6 text-sm">
        <p className="text-muted-foreground">{message}</p>
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
    </ContentLayout>
  );
}
