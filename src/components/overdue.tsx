import { CalendarArrowDown, ChevronDown } from "lucide-react";
import Link from "next/link";
import { bringToToday } from "@/app/actions";
import type { TaskWithCategory } from "@/db/queries";
import { formatDayShort } from "@/lib/dates";
import { iconBtn } from "@/lib/ui";

export function Overdue({ tasks }: { tasks: TaskWithCategory[] }) {
  if (tasks.length === 0) return null;
  return (
    <details className="group mt-6 rounded-2xl border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold">
        <span>
          Pendentes <span className="ml-1 rounded-full bg-fg px-2 py-0.5 text-xs text-bg">{tasks.length}</span>
        </span>
        <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 pb-4">
        <ul className="divide-y divide-line">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <Link href={`/tarefas/${t.id}`} className="min-w-0 flex-1 break-words">
                {t.title}
              </Link>
              <span className="shrink-0 text-xs text-muted">{t.date && formatDayShort(t.date)}</span>
              <form action={bringToToday}>
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" aria-label="Trazer para hoje" title="Trazer para hoje" className={`${iconBtn} size-9`}>
                  <CalendarArrowDown size={16} />
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={bringToToday} className="mt-3">
          {tasks.map((t) => (
            <input key={t.id} type="hidden" name="id" value={t.id} />
          ))}
          <button type="submit" className="text-sm font-semibold underline underline-offset-4">
            Trazer todas para hoje
          </button>
        </form>
      </div>
    </details>
  );
}
