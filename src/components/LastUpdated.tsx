export function LastUpdated({
  asOfText,
  scheduleText,
  staleWarningText,
}: {
  asOfText: string;
  scheduleText: string;
  staleWarningText?: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-xs text-neutral-400">
      <span>{asOfText}</span>
      <span className="text-neutral-500">{scheduleText}</span>
      {staleWarningText ? (
        <span className="mt-1 rounded-md bg-amber-900/40 px-2 py-1 text-amber-300">
          {staleWarningText}
        </span>
      ) : null}
    </div>
  );
}
