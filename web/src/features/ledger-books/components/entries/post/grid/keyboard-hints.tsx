const Hint = ({ k, label }: { k: string; label: string }) => (
  <span className="flex items-center gap-1.5">
    <kbd className="bg-muted text-foreground rounded-md px-2 py-0.5 text-xs font-medium">
      {k}
    </kbd>
    {label}
  </span>
);

export default function KeyboardHints() {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
      <Hint k="Tab" label="ô kế" />
      <Hint k="Enter" label="ô kế" />
      <Hint k="Ctrl+V" label="dán từ Excel" />
    </div>
  );
}
