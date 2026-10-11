import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import type { Category } from "../finance";
import { parseTransactionMessage } from "./parse-transaction";

const categories: Category[] = [
  { id: "c-mercado", name: "Mercado", kind: "expense" },
  { id: "c-transp", name: "Transporte", kind: "expense" },
  { id: "c-outros-d", name: "Outros", kind: "expense" },
  { id: "c-prolabore", name: "Pró-labore", kind: "income" },
  { id: "c-outros-r", name: "Outros", kind: "income" },
];
const opts = { categories, today: "2026-10-10", weekday: "sábado" };

/** Cliente falso que devolve um parsed_output fixo e guarda a requisição. */
function fakeClient(parsed_output: unknown, stop_reason = "end_turn") {
  const parse = vi.fn().mockResolvedValue({ parsed_output, stop_reason });
  return { client: { beta: { messages: { parse } } } as unknown as Anthropic, parse };
}

describe("parseTransactionMessage", () => {
  it("mapeia categoria e forma de pagamento para os registros da família", async () => {
    const { client, parse } = fakeClient({
      transactions: [
        { kind: "expense", amount: 230.5, date: "2026-10-10", category: "mercado", payment_method: "Cartão de crédito", description: "Mercado" },
      ],
      question: null,
    });
    const res = await parseTransactionMessage("mercado 230,50 no cartão", opts, client);
    expect(res).toEqual({
      ok: true,
      transactions: [
        {
          kind: "expense",
          amount: 230.5,
          date: "2026-10-10",
          categoryId: "c-mercado",
          categoryName: "Mercado",
          paymentMethod: "Cartão de crédito",
          description: "Mercado",
        },
      ],
    });
    const body = parse.mock.calls[0][0];
    expect(body.messages[0].content).toContain("Hoje: 2026-10-10 (sábado)");
    expect(body.messages[0].content).toContain("Pró-labore");
  });

  it("categoria desconhecida cai em Outros do mesmo tipo; forma de pagamento inválida vira null", async () => {
    const { client } = fakeClient({
      transactions: [
        { kind: "income", amount: 8000, date: "2026-10-01", category: "Inexistente", payment_method: "cheque", description: null },
      ],
      question: null,
    });
    const res = await parseTransactionMessage("recebi 8000", opts, client);
    expect(res.ok && res.transactions[0]).toMatchObject({ categoryId: "c-outros-r", paymentMethod: null });
  });

  it("vários lançamentos numa mensagem e descarta valores inválidos", async () => {
    const { client } = fakeClient({
      transactions: [
        { kind: "expense", amount: 32, date: "2026-10-09", category: "Transporte", payment_method: null, description: "Uber" },
        { kind: "expense", amount: 0, date: "2026-10-09", category: "Mercado", payment_method: null, description: null },
        { kind: "expense", amount: 15.333, date: "data ruim", category: "Mercado", payment_method: "Pix", description: " Pão " },
      ],
      question: null,
    });
    const res = await parseTransactionMessage("uber 32 ontem e padaria 15,33 no pix", opts, client);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.transactions).toHaveLength(2);
    expect(res.transactions[1]).toMatchObject({ amount: 15.33, date: "2026-10-10", description: "Pão", paymentMethod: "Pix" });
  });

  it("devolve a pergunta quando falta informação", async () => {
    const { client } = fakeClient({ transactions: [], question: "Qual foi o valor do mercado?" });
    expect(await parseTransactionMessage("fui ao mercado", opts, client)).toEqual({
      ok: false,
      question: "Qual foi o valor do mercado?",
    });
  });

  it("trata recusa do modelo", async () => {
    const { client } = fakeClient(null, "refusal");
    const res = await parseTransactionMessage("???", opts, client);
    expect(res.ok).toBe(false);
  });
});
