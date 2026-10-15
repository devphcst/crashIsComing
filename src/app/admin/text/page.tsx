import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { DEFAULT_TEXTS } from "@/lib/text-defaults";
import { readTextOverrides } from "@/lib/text-overrides";
import { TextEditor } from "./TextEditor";

export const dynamic = "force-dynamic";

export default async function AdminTextPage() {
  noStore();
  const overrides = await readTextOverrides();
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-fg">투자유형 테스트 — 텍스트 수정</h1>
        <Link
          href="/admin"
          className="rounded-md border border-line px-3 py-1 text-xs text-muted hover:text-fg"
        >
          ← 어드민
        </Link>
      </header>

      <p className="text-xs text-muted">
        기본값은 코드에 하드코딩. 여기서 입력하면 KV에 오버라이드로 저장되고,
        빈 값은 기본값으로 되돌립니다. 저장 즉시 모든 페이지에 반영돼요.
      </p>

      <TextEditor defaults={DEFAULT_TEXTS} initialOverrides={overrides} />
    </main>
  );
}
