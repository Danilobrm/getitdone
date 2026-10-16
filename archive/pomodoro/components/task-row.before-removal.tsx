import { Check, Repeat2 } from "lucide-react";
import Link from "next/link";
import { toggleTask } from "@/app/actions";
import type { TaskWithCategory } from "@/db/queries";

export function TaskRow({ task }: { task: TaskWithCategory }) {
  const done = task.status === "done";
  return (
    <li className="flex items-center gap-4 py-3">
      <form action={toggleTask}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="done" value={String(!done)} />
        <button
          type="submit"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? "Marcar como não feita" : "Marcar como feita"}
          className={`grid size-7 place-items-center rounded-full border-2 transition active:scale-90 ${
            done ? "border-fg bg-fg text-bg" : "border-muted hover:border-fg"
          }`}
        >
          {done && <Check size={15} strokeWidth={3} />}
        </button>
      </form>
      <Link
        href={`/tarefas/${task.id}`}
        className={`min-w-0 flex-1 break-words text-[17px] leading-snug ${done ? "text-muted line-through" : ""}`}
      >
        {task.title}
      </Link>
      {task.recurringRuleId && <Repeat2 size={15} className="shrink-0 text-muted" aria-label="Rotina" />}
      {task.status === "doing" && (
        <span className="rounded-full bg-fg px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-bg">
          agora
        </span>
      )}
    </li>
  );
}
