import { Plus } from "lucide-react";
import Link from "next/link";

/** Floating "+" above the bottom nav that opens the new-task form. */
export function AddTaskFab({ href }: { href: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10">
      <div className="mx-auto flex max-w-xl justify-end px-5">
        <Link
          href={href}
          aria-label="Adicionar tarefa"
          className="pointer-events-auto grid size-14 place-items-center rounded-full bg-fg text-bg shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] transition active:scale-95"
        >
          <Plus size={26} />
        </Link>
      </div>
    </div>
  );
}
