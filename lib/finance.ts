import type { SupabaseClient } from "@supabase/supabase-js";
import { monthRange } from "./dates";

export type Kind = "expense" | "income";

export const PAYMENT_METHODS = [
  "Pix",
  "Cartão de crédito",
  "Cartão de débito",
  "Dinheiro",
  "Boleto",
  "Transferência",
] as const;

export type Category = { id: string; name: string; kind: Kind };

export type Transaction = {
  id: string;
  kind: Kind;
  amount: number;
  occurred_on: string;
  category_id: string | null;
  payment_method: string | null;
  description: string | null;
  source: "app" | "telegram";
  user_id: string | null;
  created_at: string;
  categories: { name: string } | null;
};

export const TX_SELECT =
  "id, kind, amount, occurred_on, category_id, payment_method, description, source, user_id, created_at, categories(name)";

export async function getCategories(supabase: SupabaseClient, householdId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("household_id", householdId)
    .order("name");
  if (error) throw error;
  // "Outros" sempre por último
  return (data as Category[]).sort((a, b) => Number(a.name === "Outros") - Number(b.name === "Outros"));
}

export async function getMonthTransactions(
  supabase: SupabaseClient,
  householdId: string,
  month: string,
): Promise<Transaction[]> {
  const { start, end } = monthRange(month);
  const { data, error } = await supabase
    .from("transactions")
    .select(TX_SELECT)
    .eq("household_id", householdId)
    .gte("occurred_on", start)
    .lt("occurred_on", end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Transaction[]).map((t) => ({ ...t, amount: Number(t.amount) }));
}

export type Summary = {
  income: number;
  expense: number;
  balance: number;
  expenseByCategory: { name: string; total: number }[];
};

export function summarize(transactions: Pick<Transaction, "kind" | "amount" | "categories">[]): Summary {
  let income = 0;
  let expense = 0;
  const byCat = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind === "income") income += t.amount;
    else {
      expense += t.amount;
      const name = t.categories?.name ?? "Sem categoria";
      byCat.set(name, (byCat.get(name) ?? 0) + t.amount);
    }
  }
  return {
    income: round2(income),
    expense: round2(expense),
    balance: round2(income - expense),
    expenseByCategory: [...byCat]
      .map(([name, total]) => ({ name, total: round2(total) }))
      .sort((a, b) => b.total - a.total),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
