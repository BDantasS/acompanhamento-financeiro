import { Trash2 } from "lucide-react";
import { Card, CardTitle, Empty, PageHeader, Stat } from "@/components/ui";
import { currentMonth, todayISO } from "@/lib/dates";
import { formatBRL, formatDate, formatMonth } from "@/lib/format";
import { loadPortfolio } from "@/lib/investments";
import { realMonthlySeries } from "@/lib/portfolio";
import { getContext } from "@/lib/session";
import { deleteMovement, toggleArchive } from "./actions";
import { InvestmentForms } from "./forms";

export default async function InvestimentosPage() {
  const { supabase, household, members } = await getContext();
  const { investments, movements, snapshots } = await loadPortfolio(supabase, household.id);
  const month = currentMonth();
  const names = new Map(members.map((m) => [m.user_id, m.display_name]));
  const invNames = new Map(investments.map((i) => [i.id, i.name]));

  const rows = investments.map((inv) => {
    const point = realMonthlySeries(
      [inv.id],
      movements.filter((m) => m.investment_id === inv.id),
      snapshots.filter((s) => s.investment_id === inv.id),
      month,
      month,
    )[0];
    const lastSnapshot = snapshots
      .filter((s) => s.investment_id === inv.id)
      .sort((a, b) => b.month.localeCompare(a.month))[0];
    return { inv, balance: point?.balance ?? 0, contributed: point?.contributed ?? 0, lastSnapshot };
  });

  const total = rows.reduce((s, r) => s + r.balance, 0);
  const contributed = rows.reduce((s, r) => s + r.contributed, 0);
  const gain = total - contributed;

  return (
    <>
      <PageHeader title="Investimentos" subtitle="Carteira da família" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Patrimônio" value={formatBRL(total)} />
        <Stat label="Total aportado" value={formatBRL(contributed)} hint="Aportes − resgates" />
        <Stat
          label="Rendimento"
          value={formatBRL(gain)}
          tone={gain >= 0 ? "income" : "expense"}
          hint={contributed > 0 ? `${((gain / contributed) * 100).toFixed(1).replace(".", ",")}% sobre o aportado` : undefined}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="h-fit">
          <InvestmentForms investments={investments} today={todayISO()} month={month} />
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Carteira</CardTitle>
            {rows.length === 0 ? (
              <Empty>Cadastre seu primeiro investimento ao lado.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map(({ inv, balance, contributed, lastSnapshot }) => (
                  <li key={inv.id} className={`flex items-center gap-3 py-3 ${inv.archived ? "opacity-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{inv.name}</p>
                      <p className="truncate text-xs text-muted">
                        {[inv.type, inv.institution].filter(Boolean).join(" · ")}
                        {" · "}
                        {lastSnapshot ? `saldo informado em ${formatMonth(lastSnapshot.month)}` : "sem saldo informado"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-sm font-semibold">{formatBRL(balance)}</p>
                      <p className="tabular text-xs text-muted">aportado {formatBRL(contributed)}</p>
                    </div>
                    <form action={toggleArchive}>
                      <input type="hidden" name="id" value={inv.id} />
                      <input type="hidden" name="archived" value={String(!inv.archived)} />
                      <button className="text-xs text-muted hover:text-foreground">{inv.archived ? "Reativar" : "Arquivar"}</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle>Últimos movimentos</CardTitle>
            {movements.length === 0 ? (
              <Empty>Nenhum aporte registrado.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {movements.slice(0, 20).map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{invNames.get(m.investment_id)}</p>
                      <p className="truncate text-xs text-muted">
                        {[formatDate(m.occurred_on), m.note, m.user_id && names.get(m.user_id)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className={`tabular text-sm font-semibold ${m.kind === "deposit" ? "text-income" : "text-expense"}`}>
                      {m.kind === "deposit" ? "+" : "−"} {formatBRL(m.amount)}
                    </span>
                    <form action={deleteMovement}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="p-1 text-muted hover:text-expense" aria-label="Excluir movimento">
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
