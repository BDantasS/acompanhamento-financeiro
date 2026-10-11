import { addMonths } from "./dates";

export type ProjectionInput = {
  initialAmount: number;
  monthlyContribution: number;
  /** Ex.: 0.015 para 1,5% ao mês */
  monthlyRate: number;
  years: number;
  /** "YYYY-MM": mês do primeiro aporte */
  startMonth: string;
  /** Ex.: 0.045 para 4,5% ao ano. Usado só para o valor "em dinheiro de hoje". */
  annualInflation?: number;
};

export type ProjectionPoint = {
  /** "YYYY-MM": saldo no fim deste mês */
  month: string;
  index: number;
  contributed: number;
  balance: number;
  interest: number;
  /** Saldo descontada a inflação (poder de compra de hoje) */
  balanceToday: number;
};

/**
 * Juros compostos mensais com aporte no fim de cada mês:
 *   saldo_n = saldo_{n-1} * (1 + taxa) + aporte
 * O ponto de índice 0 é o saldo inicial, antes do primeiro aporte.
 */
export function projectMonthly(input: ProjectionInput): ProjectionPoint[] {
  const months = Math.round(input.years * 12);
  const inflationMonthly = Math.pow(1 + (input.annualInflation ?? 0), 1 / 12) - 1;

  const points: ProjectionPoint[] = [];
  let balance = input.initialAmount;
  let contributed = input.initialAmount;

  for (let i = 0; i <= months; i++) {
    if (i > 0) {
      balance = balance * (1 + input.monthlyRate) + input.monthlyContribution;
      contributed += input.monthlyContribution;
    }
    points.push({
      // Índice i = fim do i-ésimo mês; o índice 0 é o saldo inicial (fim do mês anterior).
      month: addMonths(input.startMonth, i - 1),
      index: i,
      contributed: round2(contributed),
      balance: round2(balance),
      interest: round2(balance - contributed),
      balanceToday: round2(balance / Math.pow(1 + inflationMonthly, i)),
    });
  }
  return points;
}

/** Um ponto por ano (meses 12, 24, ...), para a tabela. */
export function yearlySummary(points: ProjectionPoint[]): ProjectionPoint[] {
  return points.filter((p) => p.index > 0 && p.index % 12 === 0);
}

/** 1,5% a.m. -> 19,56% a.a. */
export function monthlyToAnnual(rate: number) {
  return Math.pow(1 + rate, 12) - 1;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
