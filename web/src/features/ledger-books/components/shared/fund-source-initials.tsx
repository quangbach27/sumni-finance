import { initials } from './fund-source-label';

/** Round avatar showing the initials of a fund source name. */
export default function FundSourceInitials({ name }: { name: string }) {
  return (
    <span className="bg-muted text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
      {initials(name)}
    </span>
  );
}
