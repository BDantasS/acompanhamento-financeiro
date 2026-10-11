import { describe, expect, it } from "vitest";
import { currentBalances, realMonthlySeries, type Movement, type Snapshot } from "./portfolio";

const dep = (investment_id: string, occurred_on: string, amount: number): Movement => ({
  investment_id,
  kind: "deposit",
  amount,
  occurred_on,
});

describe("realMonthlySeries", () => {
  it("sem saldo informado, soma aportes e resgates", () => {
    const movements: Movement[] = [
      dep("a", "2026-01-05", 3000),
      dep("a", "2026-02-05", 3000),
      { investment_id: "a", kind: "withdrawal", amount: 500, occurred_on: "2026-03-10" },
    ];
    const series = realMonthlySeries(["a"], movements, [], "2026-01", "2026-03");
    expect(series).toEqual([
      { month: "2026-01", balance: 3000, contributed: 3000 },
      { month: "2026-02", balance: 6000, contributed: 6000 },
      { month: "2026-03", balance: 5500, contributed: 5500 },
    ]);
  });

  it("saldo informado substitui a estimativa e serve de base para os meses seguintes", () => {
    const movements = [dep("a", "2026-01-05", 3000), dep("a", "2026-02-05", 3000), dep("a", "2026-03-05", 3000)];
    const snapshots: Snapshot[] = [{ investment_id: "a", month: "2026-02-01", balance: 6100 }];
    const series = realMonthlySeries(["a"], movements, snapshots, "2026-01", "2026-03");
    expect(series.map((p) => p.balance)).toEqual([3000, 6100, 9100]);
    expect(series.at(-1)?.contributed).toBe(9000);
  });

  it("soma vários investimentos e considera histórico anterior ao período", () => {
    const movements = [dep("a", "2025-06-01", 1000), dep("b", "2026-01-15", 2000)];
    const series = realMonthlySeries(["a", "b"], movements, [], "2026-01", "2026-01");
    expect(series).toEqual([{ month: "2026-01", balance: 3000, contributed: 3000 }]);
  });
});

describe("currentBalances", () => {
  it("por investimento", () => {
    const movements = [dep("a", "2026-01-05", 100), dep("b", "2026-01-05", 200)];
    const snapshots: Snapshot[] = [{ investment_id: "b", month: "2026-01-01", balance: 210 }];
    const balances = currentBalances(["a", "b"], movements, snapshots, "2026-02");
    expect(balances.get("a")).toBe(100);
    expect(balances.get("b")).toBe(210);
  });
});
