import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { TaskWithCategory } from "@/db/queries";

/** Cards for undated tasks; opening one is where you set a day and schedule it. */
export function Backlog({ tasks }: { tasks: TaskWithCategory[] }) {
  if (tasks.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className="text-lg font-medium">Backlog vazio.</p>
        <p className="mt-1 text-sm text-muted">Toque em + para guardar uma tarefa sem dia.</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link href={`/tarefas/${t.id}`} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3.5 text-[17px] leading-snug transition hover:border-fg">
            <span className="min-w-0 flex-1 break-words">{t.title}</span>
            <ChevronRight size={18} className="shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
