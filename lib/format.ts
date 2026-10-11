const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 });

export const formatBRL = (value: number) => brl.format(value);
export const formatBRLCompact = (value: number) => brlCompact.format(value);
export const formatPct = (value: number) => pct.format(value);

/** "2026-10-10" -> "10/10/2026" (sem passar por Date, para não sofrer com fuso). */
export function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-10" ou "2026-10-01" -> "out/2026" */
export function formatMonth(iso: string) {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]}/${y}`;
}

/** Aceita "1.234,56", "1234.56", "1234,5", "R$ 30" etc. */
export function parseMoney(input: string): number {
  let s = input.replace(/[^\d,.-]/g, "");
  if (!/\d/.test(s)) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
