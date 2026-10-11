import { addMonths, monthDiff } from "./dates";

export type Movement = {
  investment_id: string;
  kind: "deposit" | "withdrawal";
  amount: number;
  occurred_on: string; // YYYY-MM-DD
};

export type Snapshot = {
  investment_id: string;
  month: string; // YYYY-MM-01
  balance: number;
};

export type RealPoint = {
  month: string; // YYYY-MM
  /** Patrimônio estimado no fim do mês */
  balance: number;
  /** Aportes líquidos acumulados (aportes - resgates) */
  contributed: number;
};

/**
 * Patrimônio real mês a mês, somando todos os investimentos.
 * Para cada investimento:
 *  - se houver saldo informado para o mês, usa esse saldo;
 *  - senão, parte do último saldo informado e soma os aportes/resgates feitos depois dele
 *    (sem rendimento, que só aparece quando um novo saldo é informado).
 */
export function realMonthlySeries(
  investmentIds: string[],
  movements: Movement[],
  snapshots: Snapshot[],
  fromMonth: string,
  toMonth: string,
): RealPoint[] {
  const n = monthDiff(fromMonth, toMonth);
  if (n < 0) return [];

  const netByInvMonth = new Map<string, number>();
  for (const m of movements) {
    const key = `${m.investment_id}|${m.occurred_on.slice(0, 7)}`;
    const signed = m.kind === "deposit" ? Number(m.amount) : -Number(m.amount);
    netByInvMonth.set(key, (netByInvMonth.get(key) ?? 0) + signed);
  }
  const snapByInvMonth = new Map<string, number>();
  for (const s of snapshots) {
    snapByInvMonth.set(`${s.investment_id}|${s.month.slice(0, 7)}`, Number(s.balance));
  }

  // Começa a contar desde o primeiro movimento/snapshot, mesmo antes de fromMonth.
  const allMonths = [
    ...movements.map((m) => m.occurred_on.slice(0, 7)),
    ...snapshots.map((s) => s.month.slice(0, 7)),
  ].sort();
  const firstMonth = allMonths[0] && allMonths[0] < fromMonth ? allMonths[0] : fromMonth;

  const balance = new Map<string, number>(investmentIds.map((id) => [id, 0]));
  let contributed = 0;
  const out: RealPoint[] = [];

  const total = monthDiff(firstMonth, toMonth);
  for (let i = 0; i <= total; i++) {
    const month = addMonths(firstMonth, i);
    for (const id of investmentIds) {
      const key = `${id}|${month}`;
      const net = netByInvMonth.get(key) ?? 0;
      contributed += net;
      const snap = snapByInvMonth.get(key);
      balance.set(id, snap ?? Math.max(0, (balance.get(id) ?? 0) + net));
    }
    if (month >= fromMonth) {
      let sum = 0;
      for (const v of balance.values()) sum += v;
      out.push({ month, balance: round2(sum), contributed: round2(contributed) });
    }
  }
  return out;
}

/** Saldo atual estimado de cada investimento (último mês da série). */
export function currentBalances(
  investmentIds: string[],
  movements: Movement[],
  snapshots: Snapshot[],
  month: string,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const id of investmentIds) {
    const series = realMonthlySeries(
      [id],
      movements.filter((m) => m.investment_id === id),
      snapshots.filter((s) => s.investment_id === id),
      month,
      month,
    );
    result.set(id, series.at(-1)?.balance ?? 0);
  }
  return result;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
