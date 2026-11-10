import { Info } from 'lucide-react';

import { Progress } from '@/components/ui/progress';

type Counts = {
  totalCount: number;
  reconciledCount: number;
  matchedCount: number;
  mismatchedCount: number;
};

/** Instructions and progress shown above the statements while reconciling. */
export default function ReconciliationIntro({
  totalCount,
  reconciledCount,
  matchedCount,
  mismatchedCount,
}: Counts) {
  return (
    <>
      <p className="text-muted-foreground text-sm md:hidden">
        Nhập số dư theo sao kê và số tiền mặt đếm được, rồi xác nhận từng nguồn
        quỹ.
      </p>
      <div className="bg-muted/50 hidden gap-3 rounded-2xl border p-4 text-sm md:flex md:text-base">
        <Info className="text-muted-foreground mt-0.5 size-5 shrink-0" />
        <p>
          <strong>Đối chiếu số dư hệ thống với số dư thực tế.</strong>{' '}
          <span className="text-muted-foreground">
            Nhập số dư theo sao kê ngân hàng và số tiền mặt đếm được, rồi xác
            nhận từng nguồn quỹ khi đã khớp. Chỉ hoàn tất đối soát khi mọi nguồn
            quỹ đều được xác nhận.
          </span>
        </p>
      </div>

      <Progress
        value={totalCount ? (reconciledCount / totalCount) * 100 : 0}
        className="bg-card items-center gap-x-3 gap-y-2 rounded-2xl border p-4 shadow-sm md:px-8"
      >
        <span className="font-semibold">
          {reconciledCount}/{totalCount} nguồn quỹ đã đối soát
        </span>
        {reconciledCount < totalCount && (
          <span className="text-muted-foreground ml-auto text-sm">
            {matchedCount} khớp chờ xác nhận · {mismatchedCount} lệch
          </span>
        )}
      </Progress>
    </>
  );
}
