import { Trash2 } from "lucide-react";
import { iconBtn } from "@/lib/ui";

/** Two-step delete without client JS: open the details, then confirm. */
export function ConfirmDelete({
  action,
  id,
  label,
  warning,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label: string;
  warning: string;
}) {
  return (
    <details className="group">
      <summary aria-label={label} title={label} className={`${iconBtn} cursor-pointer list-none`}>
        <Trash2 size={16} />
      </summary>
      <form action={action} className="mt-2 flex flex-col gap-3 rounded-xl border border-fg p-4 text-sm">
        <input type="hidden" name="id" value={id} />
        <p>{warning}</p>
        <button type="submit" className="self-start rounded-lg bg-fg px-4 py-2 font-semibold text-bg">
          Confirmar exclusão
        </button>
      </form>
    </details>
  );
}
