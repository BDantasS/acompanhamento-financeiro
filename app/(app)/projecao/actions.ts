"use server";

import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";

export type PlanInput = {
  initialAmount: number;
  monthlyContribution: number;
  monthlyRate: number;
  years: number;
  annualInflation: number;
  startMonth: string;
};

export async function savePlan(plan: PlanInput): Promise<{ error?: string }> {
  const { supabase, household } = await getContext();
  if (!/^\d{4}-\d{2}$/.test(plan.startMonth)) return { error: "Mês de início inválido." };
  if (!(plan.years >= 1 && plan.years <= 60)) return { error: "Prazo deve ser de 1 a 60 anos." };

  const { error } = await supabase.from("projection_plans").upsert({
    household_id: household.id,
    initial_amount: plan.initialAmount,
    monthly_contribution: plan.monthlyContribution,
    monthly_rate: plan.monthlyRate,
    years: Math.round(plan.years),
    annual_inflation: plan.annualInflation,
    start_month: `${plan.startMonth}-01`,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath("/projecao");
  return {};
}
