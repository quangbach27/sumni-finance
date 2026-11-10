import { useState } from 'react';

import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

type TagInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
};

/** Chips: Enter or comma adds, ✕ removes, Backspace on empty removes the last. */
export default function TagInput({
  value,
  onChange,
  placeholder,
  invalid,
  disabled,
  'aria-label': ariaLabel,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const tag = draft.trim();
    if (tag) onChange([...value, tag]);
    setDraft('');
  };

  return (
    <div
      className={cn(
        'flex min-h-12 flex-wrap items-center gap-1.5 px-3 py-1.5',
        invalid && 'ring-destructive/50 ring-1 ring-inset',
      )}
    >
      {value.map((tag, i) => (
        <Badge
          key={`${tag}-${i}`}
          variant="secondary"
          className="bg-primary/10 text-primary ring-primary/20 h-7 gap-1.5 ring-1 ring-inset"
        >
          {tag}
          <button
            type="button"
            className="hover:bg-primary/20 -mr-1 rounded-full p-0.5"
            disabled={disabled}
            aria-label={`Xóa thẻ ${tag}`}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <X className="size-3.5" />
          </button>
        </Badge>
      ))}
      <input
        value={draft}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="placeholder:text-muted-foreground min-w-32 flex-1 bg-transparent text-base outline-none md:text-sm"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            e.stopPropagation();
            commit();
          } else if (e.key === 'Backspace' && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
      />
    </div>
  );
}
