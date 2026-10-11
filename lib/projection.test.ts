import { describe, expect, it } from "vitest";
import { monthlyToAnnual, projectMonthly, yearlySummary } from "./projection";

const base = {
  initialAmount: 0,
  monthlyContribution: 3000,
  monthlyRate: 0.015,
  years: 10,
  startMonth: "2026-01",
};

describe("projectMonthly", () => {
  it("R$ 3.000/mês a 1,5% a.m. por 12 meses", () => {
    const points = projectMonthly(base);
    const year1 = points[12];
    // 3000 * ((1.015^12 - 1) / 0.015)
    expect(year1.balance).toBeCloseTo(39123.6, 0);
    expect(year1.contributed).toBe(36000);
    expect(year1.interest).toBeCloseTo(3123.6, 0);
    expect(year1.month).toBe("2026-12");
  });

  it("10 anos", () => {
    const points = projectMonthly(base);
    expect(points).toHaveLength(121);
    expect(points[120].contributed).toBe(360000);
    expect(points[120].balance).toBeCloseTo(993_896, -2);
  });

  it("considera saldo inicial", () => {
    const points = projectMonthly({ ...base, initialAmount: 10000, years: 1 });
    expect(points[0].balance).toBe(10000);
    expect(points[0].month).toBe("2025-12");
    expect(points[1].balance).toBeCloseTo(10000 * 1.015 + 3000, 2);
  });

  it("desconta inflação no valor de hoje", () => {
    const points = projectMonthly({ ...base, years: 1, annualInflation: 0.05 });
    expect(points[12].balanceToday).toBeCloseTo(points[12].balance / 1.05, 0);
  });

  it("resumo anual", () => {
    expect(yearlySummary(projectMonthly(base)).map((p) => p.index)).toEqual([
      12, 24, 36, 48, 60, 72, 84, 96, 108, 120,
    ]);
  });
});

describe("monthlyToAnnual", () => {
  it("1,5% a.m. ≈ 19,56% a.a.", () => {
    expect(monthlyToAnnual(0.015)).toBeCloseTo(0.1956, 4);
  });
});
