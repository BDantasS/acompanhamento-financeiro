"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListPlus, LineChart, PiggyBank, Settings } from "lucide-react";
import { cx } from "./ui";

const LINKS = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: ListPlus },
  { href: "/investimentos", label: "Investimentos", icon: PiggyBank },
  { href: "/projecao", label: "Projeção", icon: LineChart },
  { href: "/configuracoes", label: "Ajustes", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Barra lateral no desktop. */
export function SideNav({ householdName }: { householdName: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">R$</div>
        <span className="truncate text-sm font-semibold">{householdName}</span>
      </div>
      <nav className="flex flex-col gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
              isActive(pathname, href) ? "bg-accent-soft text-accent" : "text-muted hover:bg-background hover:text-foreground",
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

/** Barra inferior no celular. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cx(
            "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
            isActive(pathname, href) ? "text-accent" : "text-muted",
          )}
        >
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
