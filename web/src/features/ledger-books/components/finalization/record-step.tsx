import type { LedgerPeriodDetail } from '../../api/types';

/** Step 1 content: summary of the entries recorded in the closed period. */
export default function RecordStep({ period }: { period: LedgerPeriodDetail }) {
  return (
    <div className="bg-card rounded-2xl border p-4 shadow-sm md:px-8">
      <p className="font-semibold">{period.name}</p>
      <p className="text-muted-foreground text-sm">
        {period.statements.length} nguồn quỹ · {period.entryCount} bút toán đã
        ghi và kỳ đã đóng.
      </p>
    </div>
  );
}
