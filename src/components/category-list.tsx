"use client";

import { Equal, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type PointerEvent } from "react";
import { removeCategory, reorderCategoriesAction, saveCategory } from "@/app/actions";
import { field } from "@/lib/ui";

type Cat = { id: string; name: string };

// Stops the browser from starting a scroll/pan from the handle, on browsers where
// `touch-action: none` is not honored for every touch target.
function blockTouchScroll(e: TouchEvent) {
  e.preventDefault();
}

type DragState = {
  id: string;
  index: number;
  target: number;
  dy: number;
  /** Height of the dragged card plus the gap: how far neighbours slide to open the slot. */
  shift: number;
};

type Session = {
  id: string;
  index: number;
  rects: { id: string; top: number; height: number }[];
  gap: number;
  startPageY: number;
  clientY: number;
  target: number;
  raf: number;
};

/**
 * Cards reordered by dragging the handle. Pointer events (not HTML5 drag & drop) so it
 * works with touch. While dragging, cards are only translated; the DOM order changes on drop.
 */
export function CategoryList({ categories }: { categories: Cat[] }) {
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const cleanup = useRef<(() => void) | null>(null);

  const items = useMemo(() => {
    if (!localOrder) return categories;
    const byId = new Map(categories.map((c) => [c.id, c]));
    const ordered = localOrder.flatMap((id) => {
      const c = byId.get(id);
      return c ? [c] : [];
    });
    const seen = new Set(ordered.map((c) => c.id));
    return [...ordered, ...categories.filter((c) => !seen.has(c.id))];
  }, [categories, localOrder]);

  useEffect(() => () => cleanup.current?.(), []);

  // No text selection and a grabbing cursor everywhere while a card is being dragged.
  const isDragging = drag !== null;
  useEffect(() => {
    if (!isDragging) return;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging]);

  function commit(order: string[]) {
    setLocalOrder(order);
    const fd = new FormData();
    for (const id of order) fd.append("id", id);
    startTransition(async () => {
      await reorderCategoriesAction(fd);
      startTransition(() => setLocalOrder(null));
    });
  }

  function startDrag(e: PointerEvent<HTMLButtonElement>, id: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    cleanup.current?.();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // not supported for this pointer; window listeners still receive the events
    }

    const rects = items.map((c) => {
      const r = itemRefs.current.get(c.id)!.getBoundingClientRect();
      return { id: c.id, top: r.top + window.scrollY, height: r.height };
    });
    const index = rects.findIndex((r) => r.id === id);
    const first = rects[0];
    const second = rects[1];
    const gap = first && second ? Math.max(0, second.top - (first.top + first.height)) : 0;
    const s: Session = {
      id,
      index,
      rects,
      gap,
      startPageY: e.clientY + window.scrollY,
      clientY: e.clientY,
      target: index,
      raf: 0,
    };
    const me = rects[index]!;

    const update = () => {
      const dy = s.clientY + window.scrollY - s.startPageY;
      const center = me.top + me.height / 2 + dy;
      let target = 0;
      rects.forEach((r, i) => {
        if (i !== index && r.top + r.height / 2 < center) target++;
      });
      s.target = target;
      setDrag({ id, index, target, dy, shift: me.height + gap });
    };

    const tick = () => {
      // Keep scrolling while the pointer rests near the viewport edge.
      if (s.clientY < 90) window.scrollBy(0, -14);
      else if (s.clientY > window.innerHeight - 120) window.scrollBy(0, 14);
      update();
      s.raf = requestAnimationFrame(tick);
    };

    const onMove = (ev: globalThis.PointerEvent) => {
      s.clientY = ev.clientY;
    };
    const finish = (apply: boolean) => {
      cleanup.current?.();
      cleanup.current = null;
      setDrag(null);
      if (apply && s.target !== s.index) {
        const order = items.map((c) => c.id);
        order.splice(s.index, 1);
        order.splice(s.target, 0, id);
        commit(order);
      }
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    cleanup.current = () => {
      cancelAnimationFrame(s.raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    s.raf = requestAnimationFrame(tick);
    update();
  }

  function moveByKey(index: number, delta: -1 | 1) {
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    const order = items.map((c) => c.id);
    const [moved] = order.splice(index, 1);
    order.splice(to, 0, moved!);
    commit(order);
  }

  function styleFor(i: number, id: string): CSSProperties | undefined {
    if (!drag) return undefined;
    if (id === drag.id) return { transform: `translateY(${drag.dy}px)` };
    if (drag.target > drag.index && i > drag.index && i <= drag.target) {
      return { transform: `translateY(${-drag.shift}px)` };
    }
    if (drag.target < drag.index && i >= drag.target && i < drag.index) {
      return { transform: `translateY(${drag.shift}px)` };
    }
    return undefined;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((c, i) => {
        const dragging = drag?.id === c.id;
        return (
          <li
            key={c.id}
            ref={(el) => {
              if (el) itemRefs.current.set(c.id, el);
              else itemRefs.current.delete(c.id);
            }}
            style={styleFor(i, c.id)}
            className={`relative flex gap-2 rounded-2xl border bg-bg p-3 ${
              dragging
                ? "z-10 border-fg shadow-[0_14px_34px_-12px_rgba(0,0,0,0.55)]"
                : `border-line ${drag ? "transition-transform duration-150" : ""}`
            }`}
          >
            <button
              type="button"
              ref={(el) => el?.addEventListener("touchstart", blockTouchScroll, { passive: false })}
              aria-label={`Reordenar ${c.name}. Arraste, ou use as setas para cima e para baixo.`}
              onPointerDown={(e) => startDrag(e, c.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                  moveByKey(i, e.key === "ArrowUp" ? -1 : 1);
                }
              }}
              className={`-ml-1 grid size-[42px] shrink-0 touch-none select-none place-items-center rounded-lg text-muted transition [-webkit-touch-callout:none] hover:text-fg ${
                dragging ? "cursor-grabbing text-fg" : "cursor-grab"
              }`}
            >
              <Equal size={22} strokeWidth={2.2} className="pointer-events-none" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-2">
                <form action={saveCategory} className="min-w-0 flex-1">
                  <input type="hidden" name="id" value={c.id} />
                  <input
                    name="name"
                    defaultValue={c.name}
                    required
                    maxLength={40}
                    enterKeyHint="done"
                    autoComplete="off"
                    aria-label="Nome (Enter para salvar)"
                    onBlur={(e) => {
                      // Leaving the field saves a changed name; an emptied one reverts.
                      const value = e.currentTarget.value.trim();
                      if (!value) e.currentTarget.value = c.name;
                      else if (value !== c.name) e.currentTarget.form?.requestSubmit();
                    }}
                    className={`${field} py-2`}
                  />
                </form>
                <button
                  type="button"
                  aria-label="Excluir categoria"
                  title="Excluir categoria"
                  aria-expanded={confirmId === c.id}
                  onClick={() => setConfirmId(confirmId === c.id ? null : c.id)}
                  className={`grid size-[42px] shrink-0 place-items-center rounded-xl border transition hover:border-fg active:scale-[0.98] ${
                    confirmId === c.id ? "border-fg" : "border-line"
                  }`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {confirmId === c.id && (
                <form action={removeCategory} className="flex flex-col gap-3 rounded-xl border border-fg p-4 text-sm">
                  <input type="hidden" name="id" value={c.id} />
                  <p>As tarefas desta categoria continuam, mas ficam sem categoria.</p>
                  <button type="submit" className="self-start rounded-lg bg-fg px-4 py-2 font-semibold text-bg">
                    Confirmar exclusão
                  </button>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
