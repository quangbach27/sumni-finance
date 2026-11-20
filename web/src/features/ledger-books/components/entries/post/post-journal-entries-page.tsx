import { AlertCircle } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { useFundSourceBalance } from '../../../hooks/use-fund-source-balance';
import { usePostEntriesForm } from '../../../hooks/use-post-entries-form';
import { useSubmitEntries } from '../../../hooks/use-submit-entries';
import ConfirmPostDialog from './confirm-post-dialog';
import FundSourceCard, { FundSourceSummary } from './fund-source-card';
import PostJournalEntriesGrid from './grid/post-journal-entries-grid';

type Props = { periodUuid: string };

export default function PostJournalEntriesPage({ periodUuid }: Props) {
  const { period, fundSources, form, clearDraft } =
    usePostEntriesForm(periodUuid);
  const { fundSource, fundSourceName, currentBalance, totals } =
    useFundSourceBalance(form.control, fundSources);
  const submit = useSubmitEntries(form, period.uuid, clearDraft);

  const canPost = period.status === 'opened' && !!fundSource;

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={submit.openConfirm}
        className="mt-3 flex flex-col gap-3"
      >
        {period.status !== 'opened' && (
          <Alert>
            <AlertCircle />
            <AlertTitle>Kỳ không nhận bút toán</AlertTitle>
            <AlertDescription>
              Chỉ ghi được bút toán khi kỳ đang mở.
            </AlertDescription>
          </Alert>
        )}

        {form.formState.errors.rows && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Có dòng chưa hợp lệ</AlertTitle>
            <AlertDescription>
              Di chuột vào dòng được tô đỏ để xem chi tiết.
            </AlertDescription>
          </Alert>
        )}

        <FundSourceCard fundSources={fundSources} disabled={submit.isPending} />

        <div className="bg-background sticky top-14 flex h-[calc(100svh-5rem)] min-h-[24rem] flex-col">
          <PostJournalEntriesGrid
            disabled={submit.isPending}
            summary={<FundSourceSummary fundSources={fundSources} />}
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={submit.goBack}
              disabled={submit.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canPost || totals.count === 0}
            >
              Lưu {totals.count} bút toán vào {fundSourceName}
            </Button>
          </PostJournalEntriesGrid>
        </div>

        <ConfirmPostDialog
          open={submit.confirmOpen}
          onOpenChange={submit.setConfirmOpen}
          fundSourceName={fundSourceName}
          currentBalance={currentBalance}
          totals={totals}
          isPending={submit.isPending}
          error={submit.error}
          onConfirm={submit.confirm}
        />
      </form>
    </FormProvider>
  );
}
