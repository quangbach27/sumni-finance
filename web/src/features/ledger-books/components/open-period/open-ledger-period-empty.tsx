import { BookOpen, TriangleAlert, Wallet } from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export default function OpenLedgerPeriodEmpty() {
  return (
    <div className="flex flex-col gap-6">
      <Empty className="p-2">
        <EmptyHeader className="max-w-md">
          <EmptyMedia className="size-14 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 [&_svg:not([class*='size-'])]:size-6">
            <Wallet />
          </EmptyMedia>
          <EmptyTitle className="text-lg font-semibold">
            Thêm nguồn quỹ để mở kỳ
          </EmptyTitle>
          <EmptyDescription>
            Nguồn quỹ là nơi giữ tiền, như tài khoản ngân hàng hoặc tiền mặt. Kỳ
            sổ cần ít nhất một nguồn quỹ để lấy số dư đầu kỳ và ghi thu chi.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <ul className="divide-y rounded-xl border">
        <li className="flex items-center gap-4 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-800">
            <TriangleAlert className="size-5" />
          </span>
          <div>
            <p className="font-medium">Nguồn quỹ</p>
            <p className="text-muted-foreground text-sm">
              Chưa có nguồn quỹ nào. Thêm tài khoản ngân hàng hoặc tiền mặt.
            </p>
          </div>
        </li>
        <li className="flex items-center gap-4 p-4">
          <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
            <BookOpen className="size-5" />
          </span>
          <div>
            <p className="font-medium">Số dư đầu kỳ</p>
            <p className="text-muted-foreground text-sm">
              Tự động lấy từ số dư các nguồn quỹ, bạn không cần nhập.
            </p>
          </div>
        </li>
      </ul>
    </div>
  );
}
