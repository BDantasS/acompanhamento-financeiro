import type { SupabaseClient } from "@supabase/supabase-js";
import type { Movement, Snapshot } from "./portfolio";

export const INVESTMENT_TYPES = [
  "Renda fixa (CDB/LCI/LCA)",
  "Tesouro Direto",
  "Ações",
  "FIIs",
  "Fundos",
  "Previdência",
  "Cripto",
  "Poupança",
  "Outro",
] as const;

export type Investment = { id: string; name: string; type: string; institution: string | null; archived: boolean };
export type MovementRow = Movement & { id: string; note: string | null; user_id: string | null };

export async function loadPortfolio(supabase: SupabaseClient, householdId: string) {
  const [inv, mov, snap] = await Promise.all([
    supabase.from("investments").select("id, name, type, institution, archived").eq("household_id", householdId).order("created_at"),
    supabase
      .from("investment_movements")
      .select("id, investment_id, kind, amount, occurred_on, note, user_id")
      .eq("household_id", householdId)
      .order("occurred_on", { ascending: false }),
    supabase.from("investment_snapshots").select("investment_id, month, balance").eq("household_id", householdId),
  ]);
  if (inv.error) throw inv.error;
  if (mov.error) throw mov.error;
  if (snap.error) throw snap.error;

  return {
    investments: inv.data as Investment[],
    movements: (mov.data as MovementRow[]).map((m) => ({ ...m, amount: Number(m.amount) })),
    snapshots: (snap.data as Snapshot[]).map((s) => ({ ...s, balance: Number(s.balance) })),
  };
}
