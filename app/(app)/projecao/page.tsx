import { PageHeader } from "@/components/ui";
import { addMonths, currentMonth } from "@/lib/dates";
import { loadPortfolio } from "@/lib/investments";
import { realMonthlySeries } from "@/lib/portfolio";
import { getContext } from "@/lib/session";
import { ProjectionView } from "./view";

export default async function ProjecaoPage() {
  const { supabase, household } = await getContext();
  const [{ data: plan }, portfolio] = await Promise.all([
    supabase.from("projection_plans").select("*").eq("household_id", household.id).maybeSingle(),
    loadPortfolio(supabase, household.id),
  ]);

  const now = currentMonth();
  const startMonth = plan ? String(plan.start_month).slice(0, 7) : now;

  // Patrimônio real desde o mês anterior ao início da meta (= saldo inicial) até hoje.
  const real =
    startMonth <= now
      ? realMonthlySeries(
          portfolio.investments.map((i) => i.id),
          portfolio.movements,
          portfolio.snapshots,
          addMonths(startMonth, -1),
          now,
        )
      : [];

  return (
    <>
      <PageHeader title="Projeção" subtitle="Meta de investimentos × patrimônio real" />
      <ProjectionView
        initialPlan={{
          initialAmount: Number(plan?.initial_amount ?? 0),
          monthlyContribution: Number(plan?.monthly_contribution ?? 3000),
          monthlyRate: Number(plan?.monthly_rate ?? 0.015),
          years: Number(plan?.years ?? 10),
          annualInflation: Number(plan?.annual_inflation ?? 0),
          startMonth,
        }}
        real={real}
        currentMonth={now}
      />
    </>
  );
}
