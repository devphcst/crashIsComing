export function Disclaimer({ text }: { text: string }) {
  return (
    <p className="mx-auto max-w-2xl px-6 text-center text-xs leading-relaxed text-neutral-500">
      {text}
    </p>
  );
}
