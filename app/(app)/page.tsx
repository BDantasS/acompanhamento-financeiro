import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardTitle, Empty, PageHeader, Stat } from "@/components/ui";
import { MonthPicker, parseMonthParam } from "@/components/month-picker";
import { TransactionList } from "@/components/transaction-list";
import { currentMonth } from "@/lib/dates";
import { getMonthTransactions, summarize } from "@/lib/finance";
import { formatBRL } from "@/lib/format";
import { getContext } from "@/lib/session";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { supabase, household, members } = await getContext();
  const month = parseMonthParam((await searchParams).m, currentMonth());
  const transactions = await getMonthTransactions(supabase, household.id, month);
  const summary = summarize(transactions);
  const maxCat = summary.expenseByCategory[0]?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Painel"
        subtitle={household.name}
        action={<MonthPicker month={month} basePath="/" />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Entradas" value={formatBRL(summary.income)} tone="income" />
        <Stat label="Saídas" value={formatBRL(summary.expense)} tone="expense" />
        <Stat
          label="Saldo do mês"
          value={formatBRL(summary.balance)}
          tone={summary.balance >= 0 ? "income" : "expense"}
          hint={summary.income > 0 ? `${Math.round((summary.expense / summary.income) * 100)}% das entradas gastos` : undefined}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Gastos por categoria</CardTitle>
          {summary.expenseByCategory.length === 0 ? (
            <Empty>Sem despesas neste mês.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {summary.expenseByCategory.map((c) => (
                <li key={c.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="tabular font-medium">{formatBRL(c.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-background">
                    <div className="h-2 rounded-full bg-expense" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle
            action={
              <Link href="/lancamentos" className="flex items-center gap-1 text-sm font-semibold text-accent">
                <Plus size={16} /> Lançar
              </Link>
            }
          >
            Últimos lançamentos
          </CardTitle>
          <TransactionList transactions={transactions.slice(0, 8)} members={members} />
        </Card>
      </div>
    </>
  );
}
