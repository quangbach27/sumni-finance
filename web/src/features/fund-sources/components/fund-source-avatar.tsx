import { Banknote } from 'lucide-react';

import type { FundSource } from '../api/types';

export default function FundSourceAvatar({ item }: { item: FundSource }) {
  return (
    <span className="bg-muted text-primary flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold">
      {item.type === 'cash' ? (
        <Banknote className="size-5" />
      ) : (
        item.details.bank_code
      )}
    </span>
  );
}
