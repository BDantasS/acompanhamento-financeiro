import Link from "next/link";
import { Card, CardTitle, PageHeader, cx } from "@/components/ui";
import { MonthPicker, parseMonthParam } from "@/components/month-picker";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import { currentMonth, todayISO } from "@/lib/dates";
import { getCategories, getMonthTransactions, summarize } from "@/lib/finance";
import { formatBRL } from "@/lib/format";
import { getContext } from "@/lib/session";

export default async function LancamentosPage({ searchParams }: PageProps<"/lancamentos">) {
  const { supabase, household, members } = await getContext();
  const sp = await searchParams;
  const month = parseMonthParam(sp.m, currentMonth());
  const kindFilter = sp.tipo === "expense" || sp.tipo === "income" ? sp.tipo : "";
  const personFilter = typeof sp.pessoa === "string" ? sp.pessoa : "";

  const [categories, all] = await Promise.all([
    getCategories(supabase, household.id),
    getMonthTransactions(supabase, household.id, month),
  ]);
  const transactions = all.filter(
    (t) => (!kindFilter || t.kind === kindFilter) && (!personFilter || t.user_id === personFilter),
  );
  const summary = summarize(transactions);

  const filterHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ m: month, tipo: kindFilter, pessoa: personFilter, ...patch });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/lancamentos?${p}`;
  };
  const chip = (active: boolean) =>
    cx(
      "rounded-full border px-3 py-1 text-xs font-medium",
      active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground",
    );

  const filterParams: Record<string, string> = {};
  if (kindFilter) filterParams.tipo = kindFilter;
  if (personFilter) filterParams.pessoa = personFilter;

  return (
    <>
      <PageHeader
        title="Lançamentos"
        subtitle="Despesas, receitas e pró-labores da família"
        action={<MonthPicker month={month} basePath="/lancamentos" params={filterParams} />}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="h-fit">
          <CardTitle>Novo lançamento</CardTitle>
          <TransactionForm categories={categories} today={todayISO()} />
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            <Link href={filterHref({ tipo: "" })} className={chip(!kindFilter)}>Tudo</Link>
            <Link href={filterHref({ tipo: "expense" })} className={chip(kindFilter === "expense")}>Despesas</Link>
            <Link href={filterHref({ tipo: "income" })} className={chip(kindFilter === "income")}>Receitas</Link>
            {members.length > 1 && <span className="mx-1 w-px bg-border" />}
            {members.length > 1 &&
              members.map((m) => (
                <Link
                  key={m.user_id}
                  href={filterHref({ pessoa: personFilter === m.user_id ? "" : m.user_id })}
                  className={chip(personFilter === m.user_id)}
                >
                  {m.display_name}
                </Link>
              ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>Entradas <b className="tabular text-income">{formatBRL(summary.income)}</b></span>
            <span>Saídas <b className="tabular text-expense">{formatBRL(summary.expense)}</b></span>
          </div>
          <TransactionList transactions={transactions} members={members} editable />
        </Card>
      </div>
    </>
  );
}
