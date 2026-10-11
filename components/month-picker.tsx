import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths } from "@/lib/dates";
import { formatMonth } from "@/lib/format";

export function MonthPicker({ month, basePath, params = {} }: { month: string; basePath: string; params?: Record<string, string> }) {
  const href = (m: string) => `${basePath}?${new URLSearchParams({ ...params, m })}`;
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
      <Link href={href(addMonths(month, -1))} className="rounded-lg p-1.5 text-muted hover:bg-background" aria-label="Mês anterior">
        <ChevronLeft size={18} />
      </Link>
      <span className="w-20 text-center text-sm font-semibold capitalize">{formatMonth(month)}</span>
      <Link href={href(addMonths(month, 1))} className="rounded-lg p-1.5 text-muted hover:bg-background" aria-label="Próximo mês">
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}

/** Lê ?m=YYYY-MM com fallback para o mês atual. */
export function parseMonthParam(value: string | string[] | undefined, fallback: string) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value) ? value : fallback;
}
