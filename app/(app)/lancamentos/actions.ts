"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { parseMoney } from "@/lib/format";

export type TxFormState = { error?: string; ok?: number };

export async function saveTransaction(_prev: TxFormState, formData: FormData): Promise<TxFormState> {
  const { supabase, user, household } = await getContext();

  const id = String(formData.get("id") ?? "") || null;
  const kind = formData.get("kind") === "income" ? "income" : "expense";
  const amount = parseMoney(String(formData.get("amount") ?? ""));
  const occurred_on = String(formData.get("occurred_on") ?? "");
  const category_id = String(formData.get("category_id") ?? "") || null;
  const payment_method = String(formData.get("payment_method") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!(amount > 0)) return { error: "Informe um valor maior que zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurred_on)) return { error: "Data inválida." };

  const fields = { kind, amount, occurred_on, category_id, payment_method, description };
  const { error } = id
    ? await supabase.from("transactions").update(fields).eq("id", id).eq("household_id", household.id)
    : await supabase.from("transactions").insert({ ...fields, household_id: household.id, user_id: user.id, source: "app" });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  if (id) redirect(`/lancamentos?m=${occurred_on.slice(0, 7)}`);
  return { ok: Date.now() };
}

export async function deleteTransaction(formData: FormData) {
  const { supabase, household } = await getContext();
  const id = String(formData.get("id"));
  const month = String(formData.get("month") ?? "");
  await supabase.from("transactions").delete().eq("id", id).eq("household_id", household.id);
  revalidatePath("/", "layout");
  redirect(month ? `/lancamentos?m=${month}` : "/lancamentos");
}
