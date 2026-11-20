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
      <span className="truncate text-sm font-semibold">
        {getFundSourceTitle(fs)}
      </span>
      <span className="text-muted-foreground truncate text-xs font-normal">
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
        className="w-full rounded-md py-1.5 pr-2 pl-2 data-[size=default]:h-auto"
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

/** Compact fund source picker. */
export default function FundSourceCard({ fundSources, disabled }: Props) {
  const { control } = useFormContext<LedgerEntriesFormValues>();

  return (
    <div className="w-72 max-w-full">
      <FormField
        control={control}
        name="fundSourceUuid"
        label={<span className="sr-only">Ghi vào nguồn quỹ</span>}
        Component={FundSourceSelect}
        fundSources={fundSources}
        disabled={disabled}
      />
    </div>
  );
}

/** Balance this batch would leave behind; shown in the grid footer. */
export function FundSourceSummary({ fundSources }: Pick<Props, 'fundSources'>) {
  const { control } = useFormContext<LedgerEntriesFormValues>();
  const {
    fundSourceName,
    currentBalance: current,
    balanceAfter: after,
  } = useFundSourceBalance(control, fundSources);

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 tabular-nums">
      <span className="text-muted-foreground">
        Số dư {fundSourceName} sau khi lưu
        <span className="text-foreground ml-2 font-semibold">
          {formatAmount(after, DEFAULT_CURRENCY)}
        </span>
      </span>
      <span className="text-muted-foreground">
        Hiện tại {formatAmount(current, DEFAULT_CURRENCY)}
      </span>
    </div>
  );
}
