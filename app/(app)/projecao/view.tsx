"use client";

import { useState, useTransition } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Button, Card, CardTitle, Field, Input, Stat, cx } from "@/components/ui";
import { monthDiff } from "@/lib/dates";
import { formatBRL, formatBRLCompact, formatMonth, formatPct, parseMoney } from "@/lib/format";
import { monthlyToAnnual, projectMonthly, yearlySummary } from "@/lib/projection";
import type { RealPoint } from "@/lib/portfolio";
import { savePlan, type PlanInput } from "./actions";

type Row = {
  month: string;
  index: number;
  projected: number;
  contributed: number;
  real: number | null;
};

const SERIES = [
  { key: "projected", label: "Projetado", color: "var(--series-1)" },
  { key: "real", label: "Real", color: "var(--series-2)" },
  { key: "contributed", label: "Total aportado", color: "var(--muted)", dashed: true },
] as const;

const numberToField = (n: number, digits = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits });

export function ProjectionView({
  initialPlan,
  real,
  currentMonth,
}: {
  initialPlan: PlanInput;
  real: RealPoint[];
  currentMonth: string;
}) {
  // Campos como texto (formato brasileiro); o plano é derivado deles.
  const [fields, setFields] = useState({
    initialAmount: numberToField(initialPlan.initialAmount),
    monthlyContribution: numberToField(initialPlan.monthlyContribution),
    ratePct: numberToField(initialPlan.monthlyRate * 100, 4),
    years: String(initialPlan.years),
    inflationPct: numberToField(initialPlan.annualInflation * 100, 4),
    startMonth: initialPlan.startMonth,
  });
  const [todayMoney, setTodayMoney] = useState(false);
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const plan: PlanInput = {
    initialAmount: orZero(parseMoney(fields.initialAmount)),
    monthlyContribution: orZero(parseMoney(fields.monthlyContribution)),
    monthlyRate: orZero(parseMoney(fields.ratePct)) / 100,
    years: Math.min(60, Math.max(1, Math.round(orZero(Number(fields.years))) || 1)),
    annualInflation: orZero(parseMoney(fields.inflationPct)) / 100,
    startMonth: /^\d{4}-\d{2}$/.test(fields.startMonth) ? fields.startMonth : initialPlan.startMonth,
  };

  // No máximo 721 pontos: barato o suficiente para recalcular a cada tecla.
  const points = projectMonthly(plan);
  const inflationMonthly = Math.pow(1 + plan.annualInflation, 1 / 12) - 1;
  const realByMonth = new Map(real.map((r) => [r.month, r.balance]));
  const rows: Row[] = points.map((p) => {
    const deflate = todayMoney ? Math.pow(1 + inflationMonthly, p.index) : 1;
    const r = realByMonth.get(p.month);
    return {
      month: p.month,
      index: p.index,
      projected: round(p.balance / deflate),
      contributed: round(p.contributed / deflate),
      real: r === undefined ? null : round(r / deflate),
    };
  });

  const last = rows.at(-1)!;
  const elapsed = monthDiff(plan.startMonth, currentMonth) + 1; // índice do mês atual
  const nowRow = elapsed >= 0 && elapsed < rows.length ? rows[elapsed] : null;
  const gap = nowRow && nowRow.real !== null ? nowRow.real - nowRow.projected : null;
  const years = yearlySummary(points).map((p) => rows[p.index]);

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Sua meta</CardTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Aporte mensal (R$)">
            <Input inputMode="decimal" value={fields.monthlyContribution} onChange={set("monthlyContribution")} />
          </Field>
          <Field label="Rentabilidade (% a.m.)">
            <Input inputMode="decimal" value={fields.ratePct} onChange={set("ratePct")} />
          </Field>
          <Field label="Prazo (anos)">
            <Input inputMode="numeric" value={fields.years} onChange={set("years")} />
          </Field>
          <Field label="Valor inicial (R$)">
            <Input inputMode="decimal" value={fields.initialAmount} onChange={set("initialAmount")} />
          </Field>
          <Field label="Início">
            <Input type="month" value={fields.startMonth} onChange={set("startMonth")} />
          </Field>
          <Field label="Inflação (% a.a.)">
            <Input inputMode="decimal" value={fields.inflationPct} onChange={set("inflationPct")} placeholder="0" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {formatPct(plan.monthlyRate)} ao mês ≈ {formatPct(monthlyToAnnual(plan.monthlyRate))} ao ano. Aporte no fim de cada mês.
          </p>
          <div className="flex items-center gap-3">
            {message && <span className="text-sm text-muted">{message}</span>}
            <Button
              disabled={saving}
              onClick={() =>
                startSaving(async () => {
                  const res = await savePlan(plan);
                  setMessage(res.error ?? "Meta salva ✓");
                })
              }
            >
              {saving ? "Salvando…" : "Salvar meta"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Projetado em ${plan.years} ${plan.years === 1 ? "ano" : "anos"}`} value={formatBRL(last.projected)} />
        <Stat label="Total aportado" value={formatBRL(last.contributed)} />
        <Stat label="Juros acumulados" value={formatBRL(last.projected - last.contributed)} tone="income" />
        <Stat
          label="Real × meta hoje"
          value={gap === null ? "—" : `${gap >= 0 ? "+" : "−"} ${formatBRL(Math.abs(gap))}`}
          tone={gap === null ? undefined : gap >= 0 ? "income" : "expense"}
          hint={
            gap === null
              ? "Registre aportes ou saldos em Investimentos"
              : gap >= 0
                ? "À frente da meta"
                : "Atrás da meta"
          }
        />
      </div>

      <Card>
        <CardTitle
          action={
            plan.annualInflation > 0 && (
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={todayMoney} onChange={(e) => setTodayMoney(e.target.checked)} />
                Em dinheiro de hoje
              </label>
            )
          }
        >
          Evolução do patrimônio
        </CardTitle>
        <ul className="mb-2 flex flex-wrap gap-4 text-xs text-muted">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <svg width="16" height="4" aria-hidden>
                <line x1="0" y1="2" x2="16" y2="2" stroke={s.color} strokeWidth="2" strokeDasharray={"dashed" in s ? "4 3" : undefined} />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
        <div className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v: number) => formatBRLCompact(v)}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--muted)", strokeWidth: 1 }} />
              <Line dataKey="contributed" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              <Line dataKey="projected" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line
                dataKey="real"
                stroke="var(--series-2)"
                strokeWidth={2}
                dot={rows.length <= 36 ? { r: 3, strokeWidth: 0, fill: "var(--series-2)" } : false}
                activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle>Ano a ano</CardTitle>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="tabular w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 font-medium">Ano</th>
                <th className="py-2 text-right font-medium">Aportado</th>
                <th className="py-2 text-right font-medium">Juros</th>
                <th className="py-2 text-right font-medium">Projetado</th>
                <th className="py-2 text-right font-medium">Real</th>
                <th className="py-2 text-right font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {years.map((r) => {
                const realAtYear = r.real;
                const diff = realAtYear === null ? null : realAtYear - r.projected;
                return (
                  <tr key={r.index}>
                    <td className="py-2">
                      {r.index / 12}º <span className="text-xs text-muted">({formatMonth(r.month)})</span>
                    </td>
                    <td className="py-2 text-right">{formatBRL(r.contributed)}</td>
                    <td className="py-2 text-right">{formatBRL(r.projected - r.contributed)}</td>
                    <td className="py-2 text-right font-semibold">{formatBRL(r.projected)}</td>
                    <td className="py-2 text-right">{realAtYear === null ? "—" : formatBRL(realAtYear)}</td>
                    <td className={cx("py-2 text-right", diff !== null && (diff >= 0 ? "text-income" : "text-expense"))}>
                      {diff === null ? "—" : `${diff >= 0 ? "+" : "−"} ${formatBRL(Math.abs(diff))}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold capitalize">
        {formatMonth(row.month)} · mês {row.index}
      </p>
      {SERIES.map((s) => {
        const v = row[s.key];
        if (v === null) return null;
        return (
          <p key={s.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="inline-block size-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="tabular font-medium">{formatBRL(v)}</span>
          </p>
        );
      })}
    </div>
  );
}

function orZero(n: number) {
  return Number.isFinite(n) ? n : 0;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
