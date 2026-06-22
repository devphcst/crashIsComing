export function LastUpdated({
  asOfUsText,
  asOfKstText,
  scheduleText,
}: {
  asOfUsText: string;
  asOfKstText: string;
  scheduleText: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-xs text-neutral-400">
      <span>{asOfUsText}</span>
      <span className="text-neutral-500">{asOfKstText}</span>
      <span className="text-neutral-500">{scheduleText}</span>
    </div>
  );
}
