import type { Bank } from '../api/types';

const BankIcon = ({ bank }: { bank: Bank }) => (
  <span className="bg-muted group-data-selected/command-item:bg-background flex h-8 w-10 shrink-0 items-center justify-center rounded-md">
    <img
      src={bank.icon_url}
      alt=""
      className="h-5 w-8 object-contain"
      loading="lazy"
    />
  </span>
);

/** Bank icon with its code and name; shared by the trigger and the list. */
const BankSummary = ({ bank }: { bank: Bank }) => (
  <>
    <BankIcon bank={bank} />
    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
      <span className="font-semibold">{bank.code}</span>
      <span className="text-muted-foreground truncate text-sm">
        {bank.name}
      </span>
    </span>
  </>
);

export default BankSummary;
