import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { addDays, formatDayLong } from "@/lib/dates";
import { iconBtn } from "@/lib/ui";

function dayHref(day: string, today: string) {
  return day === today ? "/" : `/?d=${day}`;
}

export function DayNav({ day, today }: { day: string; today: string }) {
  return (
    <header className="flex items-center gap-3">
      <h1 className="min-w-0 flex-1 text-2xl font-semibold leading-tight tracking-tighter first-letter:uppercase">
        {formatDayLong(day)}
      </h1>
      <Link href={dayHref(addDays(day, -1), today)} aria-label="Dia anterior" className={iconBtn}>
        <ChevronLeft size={20} />
      </Link>
      <Link href={dayHref(addDays(day, 1), today)} aria-label="Próximo dia" className={iconBtn}>
        <ChevronRight size={20} />
      </Link>
    </header>
  );
}
