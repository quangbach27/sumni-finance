import { useFormContext } from 'react-hook-form';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

import FormField from '@/components/shared/form-field/form-field';

import { DEFAULT_CURRENCY, formatAmount } from '@/lib/currency';

import { useFundSourceBalance } from '../../../hooks/use-fund-source-balance';
import FundSourceInitials from '../../shared/fund-source-initials';
import {
  getFundSourceSubtitle,
  getFundSourceTitle,
} from '../../shared/fund-source-label';
import { formatSignedAmount } from './post-journal-entries-model';

import type { LedgerStatementFundSource } from '../../../api/types';
import type { LedgerEntriesFormValues } from './post-journal-entries-schema';

type Props = {
  fundSources: LedgerStatementFundSource[];
  disabled?: boolean;
};

const FundSourceOption = ({ fs }: { fs: LedgerStatementFundSource }) => (
  <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
    <FundSourceInitials name={getFundSourceTitle(fs)} />
    <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
      <span className="truncate text-base font-semibold">
        {getFundSourceTitle(fs)}
      </span>
      <span className="text-muted-foreground truncate text-sm font-normal">
        {getFundSourceSubtitle(fs)}
      </span>
    </span>
  </span>
);

type FundSourceSelectProps = {
  id?: string;
  value: string;
  onChange: (uuid: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  fundSources: LedgerStatementFundSource[];
  'aria-describedby'?: string;
};

/** Controlled fund source picker; pair with `FormField`. */
function FundSourceSelect({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
  fundSources,
  'aria-describedby': describedBy,
}: FundSourceSelectProps) {
  const selected = fundSources.find((fs) => fs.uuid === value);
  return (
    <Select
      value={value}
      onValueChange={(v) => v && onChange(v)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onBlur={onBlur}
        className="w-full rounded-xl py-2.5 pr-3 pl-3 data-[size=default]:h-auto"
      >
        {selected ? <FundSourceOption fs={selected} /> : 'Chọn nguồn quỹ'}
      </SelectTrigger>
      <SelectContent>
        {fundSources.map((fs) => (
          <SelectItem key={fs.uuid} value={fs.uuid}>
            <FundSourceOption fs={fs} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Fund source picker plus the balance this batch would leave behind. */
export default function FundSourceCard({ fundSources, disabled }: Props) {
  const { control } = useFormContext<LedgerEntriesFormValues>();
  const {
    fundSourceName,
    currentBalance: current,
    balanceAfter: after,
    totals,
  } = useFundSourceBalance(control, fundSources);

  return (
    <div className="bg-card grid gap-6 rounded-2xl border p-6 shadow-sm md:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="md:border-r md:pr-6">
        <FormField
          control={control}
          name="fundSourceUuid"
          label="Ghi vào nguồn quỹ"
          description="Mỗi bảng chỉ ghi vào một nguồn quỹ. Đổi nguồn ở đây bất cứ lúc nào."
          Component={FundSourceSelect}
          fundSources={fundSources}
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col justify-center gap-2">
        <span className="text-muted-foreground text-sm">
          Số dư {fundSourceName} sau khi lưu
        </span>
        <span className="text-5xl font-bold tabular-nums">
          {formatAmount(after, DEFAULT_CURRENCY)}
        </span>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-base tabular-nums">
          <span className="text-muted-foreground">
            Hiện tại {formatAmount(current, DEFAULT_CURRENCY)}
          </span>
          {totals.inflow > 0 && (
            <span className="text-primary">
              {formatSignedAmount(totals.inflow, 'inflow')} thu vào
            </span>
          )}
          {totals.outflow > 0 && (
            <span className="text-destructive">
              {formatSignedAmount(totals.outflow, 'outflow')} chi ra
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
