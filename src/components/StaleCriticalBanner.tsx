export function StaleCriticalBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="border-b border-red-700 bg-red-950/80 px-6 py-3 text-center text-sm font-medium text-red-100 sm:text-base"
    >
      {message}
    </div>
  );
}
