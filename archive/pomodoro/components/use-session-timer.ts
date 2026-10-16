"use client";

import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/dates";

export type SessionDTO = {
  id: string;
  kind: "focus" | "short_break" | "long_break";
  startedAtMs: number;
  plannedSec: number;
  taskId: string | null;
  taskTitle: string | null;
};

export const KIND_LABEL: Record<SessionDTO["kind"], string> = {
  focus: "Foco",
  short_break: "Pausa curta",
  long_break: "Pausa longa",
};

function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.2);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    // Audio can be blocked without a prior user gesture; the visual state still shows.
  }
}

async function notify(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options = { body, tag: "getitdone-session", icon: "/icons/192" };
  try {
    // Mobile browsers only allow notifications through a service worker registration.
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    // fall through to the page-level API
  }
  try {
    new Notification(title, options);
  } catch {
    // unsupported; the sound and on-screen state still show
  }
}

/**
 * Countdown derived from the server's started_at + planned_sec, corrected for
 * clock skew with the server time sent at render. Alerts only when the end is
 * reached while the page is open (not when reopening an already-finished one).
 */
export function useSessionTimer(session: SessionDTO, serverNowMs: number) {
  const [now, setNow] = useState(serverNowMs);
  const sawRunning = useRef(false);
  const alerted = useRef<string | null>(null);

  useEffect(() => {
    const offset = serverNowMs - Date.now();
    const tick = () => setNow(Date.now() + offset);
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [serverNowMs]);

  const remainingSec = Math.max(0, session.plannedSec - (now - session.startedAtMs) / 1000);
  const expired = remainingSec <= 0;
  const clock = formatClock(remainingSec);

  useEffect(() => {
    if (!expired) {
      sawRunning.current = true;
      return;
    }
    if (sawRunning.current && alerted.current !== session.id) {
      alerted.current = session.id;
      beep();
      void notify(
        session.kind === "focus" ? "Foco concluído" : "Pausa terminou",
        session.taskTitle ?? KIND_LABEL[session.kind],
      );
    }
  }, [expired, session.id, session.kind, session.taskTitle]);

  useEffect(() => {
    document.title = expired ? "Terminou · getitdone" : `${clock} · getitdone`;
    return () => {
      document.title = "getitdone";
    };
  }, [clock, expired]);

  return { remainingSec, expired, clock, progress: 1 - remainingSec / session.plannedSec };
}

/** Called from a user gesture so later alerts can play and notify. */
export function primeAlerts() {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  } catch {
    // ignore
  }
}
