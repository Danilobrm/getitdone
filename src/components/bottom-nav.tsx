"use client";

import { CalendarDays, Settings2, SunMedium } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", text: "Hoje", Icon: SunMedium, match: (p: string) => p === "/" || p.startsWith("/tarefas") },
  { href: "/semana", text: "Semana", Icon: CalendarDays, match: (p: string) => p.startsWith("/semana") },
  { href: "/gerenciar", text: "Gerenciar", Icon: Settings2, match: (p: string) => p.startsWith("/gerenciar") },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login") || pathname.startsWith("/cadastro")) return null;

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-xl">
        {ITEMS.map(({ href, text, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-fg" : "text-muted"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
