import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { PAYMENT_METHODS, type Category } from "../finance";

const ParsedSchema = z.object({
  transactions: z.array(
    z.object({
      kind: z.enum(["expense", "income"]),
      amount: z.number(),
      date: z.string().describe("YYYY-MM-DD"),
      category: z.string().nullable().describe("Exatamente um dos nomes de categoria fornecidos, ou null"),
      payment_method: z.string().nullable().describe("Exatamente uma das formas de pagamento fornecidas, ou null"),
      description: z.string().nullable(),
    }),
  ),
  question: z
    .string()
    .nullable()
    .describe("Pergunta curta ao usuário quando faltar informação essencial (ex.: valor). null se não houver."),
});

export type ParsedTransaction = {
  kind: "expense" | "income";
  amount: number;
  date: string;
  categoryId: string | null;
  categoryName: string | null;
  paymentMethod: string | null;
  description: string | null;
};

export type ParseResult =
  | { ok: true; transactions: ParsedTransaction[] }
  | { ok: false; question: string };

const SYSTEM = `Você registra lançamentos financeiros de uma família brasileira a partir de mensagens curtas enviadas pelo Telegram.

Regras:
- Cada valor em reais citado é um lançamento. "mercado 230,50 e farmácia 40" são dois.
- Valores usam formato brasileiro: "1.234,56" = 1234.56; "50 conto"/"50 pila" = 50; "1k" = 1000.
- kind: "income" para entradas (pró-labore, prolabore, salário, recebi, entrou, reembolso, rendimento); caso contrário "expense".
- date: a data em que aconteceu, no formato YYYY-MM-DD. Use a data de hoje informada quando não houver menção; resolva "ontem", "anteontem", "sexta", "dia 5" em relação a hoje (nunca no futuro, salvo menção explícita).
- category: escolha a categoria da lista do tipo correspondente que melhor se encaixa (ex.: "uber" -> Transporte, "ifood" -> Restaurantes, "conta de luz" -> Contas da casa). Se nada se encaixar, use "Outros". Copie o nome exatamente como na lista.
- payment_method: só preencha se a mensagem indicar (ex.: "no cartão"/"crédito" -> "Cartão de crédito", "débito" -> "Cartão de débito", "pix" -> "Pix"). Senão, null.
- description: um rótulo curto e útil com a primeira letra maiúscula (ex.: "Mercado Extra", "Uber para o trabalho"); null se não houver nada além da categoria.
- Se a mensagem não for um lançamento ou faltar o valor, devolva transactions vazio e uma pergunta curta em português em "question".`;

let client: Anthropic | null = null;
function getClient() {
  return (client ??= new Anthropic());
}

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export async function parseTransactionMessage(
  text: string,
  opts: { categories: Category[]; today: string; weekday: string },
  anthropic: Anthropic = getClient(),
): Promise<ParseResult> {
  const expense = opts.categories.filter((c) => c.kind === "expense").map((c) => c.name);
  const income = opts.categories.filter((c) => c.kind === "income").map((c) => c.name);

  const context = [
    `Hoje: ${opts.today} (${opts.weekday}).`,
    `Categorias de despesa: ${expense.join(", ")}.`,
    `Categorias de receita: ${income.join(", ")}.`,
    `Formas de pagamento: ${PAYMENT_METHODS.join(", ")}.`,
  ].join("\n");

  // O fallback do servidor só existe para os modelos maiores.
  const supportsFallback = !MODEL.startsWith("claude-haiku");

  const response = await anthropic.beta.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    ...(supportsFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    system: SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(ParsedSchema) },
    messages: [{ role: "user", content: `${context}\n\nMensagem:\n${text}` }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { ok: false, question: "Não consegui entender. Tente algo como: “mercado 230,50 no cartão”." };
  }

  const parsed = response.parsed_output;
  const byName = new Map(opts.categories.map((c) => [`${c.kind}|${c.name.toLowerCase()}`, c]));

  const transactions: ParsedTransaction[] = parsed.transactions
    .filter((t) => Number.isFinite(t.amount) && t.amount > 0)
    .map((t) => {
      const cat =
        (t.category && byName.get(`${t.kind}|${t.category.toLowerCase()}`)) ||
        byName.get(`${t.kind}|outros`) ||
        null;
      return {
        kind: t.kind,
        amount: Math.round(t.amount * 100) / 100,
        date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : opts.today,
        categoryId: cat?.id ?? null,
        categoryName: cat?.name ?? null,
        paymentMethod: PAYMENT_METHODS.find((p) => p === t.payment_method) ?? null,
        description: t.description?.trim() || null,
      };
    });

  if (transactions.length === 0) {
    return {
      ok: false,
      question: parsed.question || "Não encontrei um valor. Exemplo: “uber 32 ontem” ou “recebi pró-labore 8000”.",
    };
  }
  return { ok: true, transactions };
}
