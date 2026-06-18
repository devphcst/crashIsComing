"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderSymbolsAction } from "@/app/admin/actions";
import type { SymbolMeta } from "@/lib/symbols";

/**
 * 종목 표시 순서 드래그 앤 드롭 리스트 (admin 전용).
 *
 * 디자인
 *   - 세로 카드 스택, 각 카드 좌측에 드래그 핸들(≡)
 *   - 핸들에만 드래그 리스너 부여 → 카드 다른 영역 만져도 모바일 스크롤 정상
 *   - 드래그 중인 카드는 opacity·shadow·ring으로 시각 피드백
 *   - `touch-none`으로 핸들에서 브라우저 기본 터치(스크롤/확대) 차단
 *   - `activationConstraint: { distance: 5 }`로 5px 이상 움직여야 드래그 시작 (탭과 구분)
 *
 * 데이터 흐름
 *   - 드래그 끝 → `arrayMove`로 로컬 state 즉시 갱신 (optimistic UI)
 *   - 백그라운드로 `reorderSymbolsAction(newOrder)` 호출
 *   - 액션 내부에서 revalidatePath/revalidateTag → 메인 페이지 즉시 반영
 *   - 외부 metas prop 변경(추가/삭제) 시 useEffect로 동기화
 */

function SortableItem({ meta }: { meta: SymbolMeta }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: meta.ticker });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900/40 p-3 " +
        (isDragging ? "shadow-xl ring-1 ring-neutral-600" : "")
      }
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`${meta.displayName} 드래그하여 순서 변경`}
        className="cursor-grab touch-none select-none px-1 text-base leading-none text-neutral-500 transition-colors hover:text-neutral-200 active:cursor-grabbing"
      >
        ≡
      </button>
      <span className="text-sm text-neutral-200">{meta.displayName}</span>
    </div>
  );
}

export function SymbolReorderList({ metas }: { metas: SymbolMeta[] }) {
  const [items, setItems] = useState<SymbolMeta[]>(metas);

  // 외부에서 metas가 갱신되면(추가·삭제·재로드) 로컬 state 동기화
  useEffect(() => {
    setItems(metas);
  }, [metas]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((m) => m.ticker === active.id);
    const newIndex = items.findIndex((m) => m.ticker === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems); // optimistic
    void reorderSymbolsAction(newItems.map((m) => m.ticker));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((m) => m.ticker)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {items.map((m) => (
            <SortableItem key={m.ticker} meta={m} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
