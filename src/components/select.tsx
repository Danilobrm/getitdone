import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { field } from "@/lib/ui";

type Props = ComponentProps<"select"> & { density?: "md" | "sm" };

/** Native select (keeps the mobile picker) styled like the text inputs. */
export function Select({ density = "md", className = "", children, ...props }: Props) {
  const compact = density === "sm";
  return (
    <div className="relative">
      <select
        {...props}
        className={`${field} cursor-pointer appearance-none ${
          compact ? "rounded-lg py-1.5 pl-2.5 pr-8 text-xs" : "pr-11"
        } ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        size={compact ? 14 : 18}
        aria-hidden
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${compact ? "right-2.5" : "right-4"}`}
      />
    </div>
  );
}
