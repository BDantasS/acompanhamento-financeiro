import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { TransactionForm } from "@/components/transaction-form";
import { todayISO } from "@/lib/dates";
import { getCategories, TX_SELECT, type Transaction } from "@/lib/finance";
import { getContext } from "@/lib/session";
import { deleteTransaction } from "../actions";

export default async function EditTransactionPage({ params }: PageProps<"/lancamentos/[id]">) {
  const { id } = await params;
  const { supabase, household } = await getContext();
  const [categories, { data }] = await Promise.all([
    getCategories(supabase, household.id),
    supabase.from("transactions").select(TX_SELECT).eq("id", id).eq("household_id", household.id).maybeSingle(),
  ]);
  if (!data) notFound();
  const tx = { ...(data as unknown as Transaction), amount: Number(data.amount) };

  return (
    <>
      <Link href={`/lancamentos?m=${tx.occurred_on.slice(0, 7)}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted">
        <ArrowLeft size={16} /> Voltar
      </Link>
      <PageHeader title="Editar lançamento" />
      <Card className="max-w-md">
        <TransactionForm categories={categories} today={todayISO()} initial={tx} />
        <form action={deleteTransaction} className="mt-3 border-t border-border pt-3">
          <input type="hidden" name="id" value={tx.id} />
          <input type="hidden" name="month" value={tx.occurred_on.slice(0, 7)} />
          <Button variant="danger" className="w-full">Excluir lançamento</Button>
        </form>
      </Card>
    </>
  );
}
