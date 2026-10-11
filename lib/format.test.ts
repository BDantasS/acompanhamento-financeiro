import { describe, expect, it } from "vitest";
import { formatDate, formatMonth, parseMoney } from "./format";
import { addMonths, monthDiff, todayISO } from "./dates";

describe("parseMoney", () => {
  it.each([
    ["230,50", 230.5],
    ["1.234,56", 1234.56],
    ["1234.56", 1234.56],
    ["R$ 30", 30],
    ["abc", NaN],
  ])("%s", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });
});

describe("datas", () => {
  it("formata", () => {
    expect(formatDate("2026-10-10")).toBe("10/10/2026");
    expect(formatMonth("2026-10")).toBe("out/2026");
  });
  it("soma meses", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthDiff("2025-12", "2027-02")).toBe(14);
  });
  it("hoje no fuso de São Paulo", () => {
    // 02:00 UTC de 11/10 ainda é 10/10 em São Paulo
    expect(todayISO(new Date("2026-10-11T02:00:00Z"))).toBe("2026-10-10");
  });
});
