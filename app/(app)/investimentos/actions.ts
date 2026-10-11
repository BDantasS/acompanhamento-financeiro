"use server";

import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";
import { parseMoney } from "@/lib/format";

export type FormState = { error?: string; ok?: number };

const done = (): FormState => {
  revalidatePath("/", "layout");
  return { ok: Date.now() };
};

export async function createInvestment(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, household } = await getContext();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Dê um nome ao investimento." };

  const { error } = await supabase.from("investments").insert({
    household_id: household.id,
    name,
    type: String(formData.get("type") ?? "Outro"),
    institution: String(formData.get("institution") ?? "").trim() || null,
  });
  return error ? { error: error.message } : done();
}

export async function addMovement(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, household } = await getContext();
  const amount = parseMoney(String(formData.get("amount") ?? ""));
  const investment_id = String(formData.get("investment_id") ?? "");
  const occurred_on = String(formData.get("occurred_on") ?? "");
  if (!investment_id) return { error: "Escolha o investimento." };
  if (!(amount > 0)) return { error: "Informe um valor maior que zero." };

  const { error } = await supabase.from("investment_movements").insert({
    household_id: household.id,
    investment_id,
    user_id: user.id,
    kind: formData.get("kind") === "withdrawal" ? "withdrawal" : "deposit",
    amount,
    occurred_on,
    note: String(formData.get("note") ?? "").trim() || null,
  });
  return error ? { error: error.message } : done();
}

export async function setSnapshot(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, household } = await getContext();
  const balance = parseMoney(String(formData.get("balance") ?? ""));
  const investment_id = String(formData.get("investment_id") ?? "");
  const month = String(formData.get("month") ?? "");
  if (!investment_id) return { error: "Escolha o investimento." };
  if (!(balance >= 0)) return { error: "Informe o saldo." };
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Mês inválido." };

  const { error } = await supabase.from("investment_snapshots").upsert({
    household_id: household.id,
    investment_id,
    month: `${month}-01`,
    balance,
    updated_at: new Date().toISOString(),
  });
  return error ? { error: error.message } : done();
}

export async function deleteMovement(formData: FormData) {
  const { supabase, household } = await getContext();
  await supabase.from("investment_movements").delete().eq("id", String(formData.get("id"))).eq("household_id", household.id);
  revalidatePath("/", "layout");
}

export async function toggleArchive(formData: FormData) {
  const { supabase, household } = await getContext();
  await supabase
    .from("investments")
    .update({ archived: formData.get("archived") === "true" })
    .eq("id", String(formData.get("id")))
    .eq("household_id", household.id);
  revalidatePath("/", "layout");
}
