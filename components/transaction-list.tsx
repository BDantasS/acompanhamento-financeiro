import Link from "next/link";
import { Send } from "lucide-react";
import type { Transaction } from "@/lib/finance";
import type { Member } from "@/lib/session";
import { formatBRL, formatDate } from "@/lib/format";
import { cx, Empty } from "./ui";

export function TransactionList({
  transactions,
  members,
  editable = false,
}: {
  transactions: Transaction[];
  members: Member[];
  editable?: boolean;
}) {
  if (transactions.length === 0) return <Empty>Nenhum lançamento neste período.</Empty>;

  const names = new Map(members.map((m) => [m.user_id, m.display_name]));
  const byDate = new Map<string, Transaction[]>();
  for (const t of transactions) byDate.set(t.occurred_on, [...(byDate.get(t.occurred_on) ?? []), t]);

  return (
    <div className="flex flex-col gap-4">
      {[...byDate].map(([date, items]) => (
        <div key={date}>
          <p className="mb-1 text-xs font-semibold text-muted">{formatDate(date)}</p>
          <ul className="divide-y divide-border">
            {items.map((t) => {
              const row = (
                <div className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.description || t.categories?.name || (t.kind === "income" ? "Receita" : "Despesa")}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted">
                      {[t.categories?.name, t.payment_method, t.user_id && names.get(t.user_id)].filter(Boolean).join(" · ")}
                      {t.source === "telegram" && <Send size={11} aria-label="via Telegram" />}
                    </p>
                  </div>
                  <span className={cx("tabular text-sm font-semibold", t.kind === "income" ? "text-income" : "text-expense")}>
                    {t.kind === "income" ? "+" : "−"} {formatBRL(t.amount)}
                  </span>
                </div>
              );
              return (
                <li key={t.id}>
                  {editable ? (
                    <Link href={`/lancamentos/${t.id}`} className="-mx-2 block rounded-lg px-2 hover:bg-background">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
