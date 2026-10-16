"use client";

import { Play } from "lucide-react";
import { startNow } from "@/app/actions";
import { btnPrimary } from "@/lib/ui";
import { primeAlerts } from "./use-session-timer";

export function StartNowButton({ taskId, label }: { taskId: string; label: string }) {
  return (
    <form action={startNow} onSubmit={primeAlerts}>
      <input type="hidden" name="id" value={taskId} />
      <button type="submit" className={`${btnPrimary} w-full py-4 text-base`}>
        <Play size={18} fill="currentColor" /> {label}
      </button>
    </form>
  );
}
