import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { WeekBoard, type BoardDay } from "@/components/week-board";
import { ensureRecurringForDay, listTasksInRange } from "@/db/queries";
import { addDays, isValidDay, todayLocal, weekStartOf, weekdayOf } from "@/lib/dates";
import { requireUserId } from "@/lib/auth";
import { iconBtn } from "@/lib/ui";

export const dynamic = "force-dynamic";

function formatRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const userId = await requireUserId();
  const { w } = await searchParams;
  const today = todayLocal();
  const start = weekStartOf(isValidDay(w) ? w : today);
  const end = addDays(start, 6);
  const dayList = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  // Opening the week materializes routine tasks for each of its days.
  for (const day of dayList) await ensureRecurringForDay(userId, day);
  const tasks = await listTasksInRange(userId, start, end);

  const days: BoardDay[] = dayList.map((day) => ({
    day,
    weekday: weekdayOf(day),
    dayOfMonth: day.slice(8, 10),
    tasks: tasks.filter((t) => t.date === day),
  }));

  const thisWeek = start === weekStartOf(today);

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-5 pb-28 pt-5">
      <header className="flex items-center gap-3">
        <h1 className="min-w-0 flex-1 text-3xl font-semibold leading-tight tracking-tighter">Semana</h1>
        <Link href={`/semana?w=${addDays(start, -7)}`} aria-label="Semana anterior" className={iconBtn}>
          <ChevronLeft size={20} />
        </Link>
        <Link href={`/semana?w=${addDays(start, 7)}`} aria-label="Próxima semana" className={iconBtn}>
          <ChevronRight size={20} />
        </Link>
      </header>
      <div className="mt-2 mb-5 flex items-center justify-between text-sm text-muted">
        <span>{formatRange(start, end)}</span>
        {!thisWeek && (
          <Link href="/semana" className="font-semibold text-fg underline underline-offset-4">
            Esta semana
          </Link>
        )}
      </div>
      <WeekBoard days={days} today={today} />
    </main>
  );
}
