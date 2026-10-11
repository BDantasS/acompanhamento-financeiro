// Datas tratadas como strings ISO ("YYYY-MM-DD" / "YYYY-MM") no fuso de São Paulo,
// para que "hoje" seja o mesmo no servidor (UTC na Vercel) e no celular.

export const TIME_ZONE = "America/Sao_Paulo";

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

export function currentMonth(now = new Date()): string {
  return todayISO(now).slice(0, 7);
}

/** "2026-10" + 3 -> "2027-01" */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

/** Número de meses de `from` até `to` (ambos "YYYY-MM"). */
export function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return ty * 12 + tm - (fy * 12 + fm);
}

export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${addMonths(month, 1)}-01` };
}
