# Pomodoro (paused)

The pomodoro feature was taken out of the UI on 2026-10-15. Nothing was dropped from the
database: `pomodoro_sessions`, `settings`, `tasks.estimated_pomodoros`, `tasks.time_spent_sec`
and the `doing` status are intact, and the session/settings queries are still in
`src/db/queries.ts` (unused). This folder is excluded from TypeScript and ESLint.

## What was removed

- `components/`: `timer-panel`, `active-card`, `start-now-button`, `use-session-timer`
  (countdown, sound, notifications), `settings-form`.
- Server actions (see `app/actions.full-before-removal.ts`, section "pomodoro"):
  `startNow`, `interruptSession`, `completeSession`, `beginBreak`, `saveSettings`.
- Wiring, kept as `*.before-removal.*` snapshots of the files as they were:
  - Home (`app/home-page...`): pinned `ActiveCard`, `getDoingTask` / `getOpenSession`.
  - Task page (`app/task-page...`): time spent and pomodoro count, timer panel, "Fazer agora",
    break suggestion.
  - Manage page (`app/gerenciar-page...`): "Configurações" tab (`SettingsForm`).
  - Forms (`components/*-form.before-removal.tsx`): "Pomodoros estimados" input.
  - `task-row.before-removal.tsx`: the "agora" badge for `doing` tasks.

## Restoring

Copy the components back into `src/components/`, put the pomodoro actions back into
`src/app/actions.ts`, and re-apply the wiring from the snapshots (diff them against the current
files, since other things have changed since).
