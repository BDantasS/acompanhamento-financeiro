import "server-only";
import { Bot, InlineKeyboard, type Context } from "grammy";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/server";
import { parseTransactionMessage } from "../ai/parse-transaction";
import { currentMonth, TIME_ZONE, todayISO } from "../dates";
import { getCategories, getMonthTransactions, summarize, TX_SELECT, type Category, type Transaction } from "../finance";
import { formatBRL, formatDate, formatMonth } from "../format";

type Link = { user_id: string; household_id: string };

const HELP = `Mande seus gastos em texto livre, por exemplo:

• mercado 230,50 no cartão
• uber 32 ontem
• farmácia 45 e padaria 12 no pix
• recebi pró-labore 8.000

Comandos:
/resumo – entradas e saídas do mês
/ultimos – últimos 5 lançamentos
/desvincular – desconecta este Telegram`;

async function getLink(db: SupabaseClient, ctx: Context): Promise<Link | null> {
  if (!ctx.from) return null;
  const { data } = await db
    .from("telegram_links")
    .select("user_id, household_id")
    .eq("telegram_user_id", ctx.from.id)
    .maybeSingle();
  return data;
}

function describe(t: { kind: string; amount: number; occurred_on: string; description: string | null; payment_method: string | null }, categoryName: string | null) {
  const today = todayISO();
  const when = t.occurred_on === today ? "hoje" : formatDate(t.occurred_on);
  const label = t.kind === "income" ? "Receita" : "Despesa";
  return [`${label} ${formatBRL(t.amount)}`, categoryName, t.payment_method, when, t.description]
    .filter(Boolean)
    .join(" · ");
}

function txKeyboard(txId: string) {
  return new InlineKeyboard().text("↩️ Desfazer", `undo:${txId}`).text("🏷️ Categoria", `cat:${txId}`);
}

export function createBot() {
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
  const db = createAdminClient();

  bot.command("start", async (ctx) => {
    const link = await getLink(db, ctx);
    if (link) return ctx.reply(`Tudo certo, este Telegram já está conectado! ✅\n\n${HELP}`);
    return ctx.reply(
      "Olá! Para conectar este Telegram à sua conta:\n\n1. Abra o app › Ajustes › Telegram\n2. Toque em “Gerar código”\n3. Envie aqui: /vincular SEUCODIGO",
    );
  });

  bot.command("ajuda", (ctx) => ctx.reply(HELP));

  bot.command("vincular", async (ctx) => {
    const code = ctx.match.trim().toUpperCase();
    if (!code) return ctx.reply("Envie o código junto: /vincular ABC123");

    const { data: row } = await db
      .from("telegram_link_codes")
      .select("user_id, household_id, expires_at")
      .eq("code", code)
      .maybeSingle();
    if (!row || new Date(row.expires_at) < new Date()) {
      return ctx.reply("Código inválido ou expirado. Gere um novo no app.");
    }

    const { error } = await db.from("telegram_links").upsert({
      telegram_user_id: ctx.from!.id,
      user_id: row.user_id,
      household_id: row.household_id,
      telegram_name: [ctx.from!.first_name, ctx.from!.last_name].filter(Boolean).join(" "),
    });
    if (error) return ctx.reply("Não consegui conectar agora. Tente novamente.");
    await db.from("telegram_link_codes").delete().eq("code", code);
    return ctx.reply(`Conectado! ✅\n\n${HELP}`);
  });

  bot.command("desvincular", async (ctx) => {
    await db.from("telegram_links").delete().eq("telegram_user_id", ctx.from!.id);
    return ctx.reply("Telegram desconectado. Use /vincular para conectar de novo.");
  });

  bot.command("resumo", async (ctx) => {
    const link = await getLink(db, ctx);
    if (!link) return ctx.reply("Conecte primeiro: /start");
    const month = currentMonth();
    const s = summarize(await getMonthTransactions(db, link.household_id, month));
    const top = s.expenseByCategory
      .slice(0, 5)
      .map((c) => `• ${c.name}: ${formatBRL(c.total)}`)
      .join("\n");
    return ctx.reply(
      `📊 ${formatMonth(month)}\n\nEntradas: ${formatBRL(s.income)}\nSaídas: ${formatBRL(s.expense)}\nSaldo: ${formatBRL(s.balance)}${top ? `\n\nMaiores gastos:\n${top}` : ""}`,
    );
  });

  bot.command("ultimos", async (ctx) => {
    const link = await getLink(db, ctx);
    if (!link) return ctx.reply("Conecte primeiro: /start");
    const { data } = await db
      .from("transactions")
      .select(TX_SELECT)
      .eq("household_id", link.household_id)
      .order("created_at", { ascending: false })
      .limit(5);
    const rows = (data ?? []) as unknown as Transaction[];
    if (rows.length === 0) return ctx.reply("Nenhum lançamento ainda.");
    return ctx.reply(rows.map((t) => `• ${describe({ ...t, amount: Number(t.amount) }, t.categories?.name ?? null)}`).join("\n"));
  });

  // Texto livre -> lançamento(s)
  bot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return ctx.reply(HELP);
    const link = await getLink(db, ctx);
    if (!link) return ctx.reply("Este Telegram ainda não está conectado. Envie /start para ver como.");

    await ctx.replyWithChatAction("typing");
    const categories = await getCategories(db, link.household_id);
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: TIME_ZONE }).format(new Date());

    let result;
    try {
      result = await parseTransactionMessage(ctx.message.text, { categories, today: todayISO(), weekday });
    } catch (err) {
      console.error("Falha ao interpretar mensagem", err);
      return ctx.reply("Tive um problema para entender agora. Tente de novo em instantes ou lance pelo app.");
    }
    if (!result.ok) return ctx.reply(result.question);

    const { data: inserted, error } = await db
      .from("transactions")
      .insert(
        result.transactions.map((t) => ({
          household_id: link.household_id,
          user_id: link.user_id,
          kind: t.kind,
          amount: t.amount,
          occurred_on: t.date,
          category_id: t.categoryId,
          payment_method: t.paymentMethod,
          description: t.description,
          source: "telegram",
        })),
      )
      .select("id, kind, amount, occurred_on, description, payment_method");
    if (error || !inserted) {
      console.error("Falha ao salvar lançamento", error);
      return ctx.reply("Não consegui salvar. Tente novamente.");
    }

    for (const [i, tx] of inserted.entries()) {
      await ctx.reply(`✅ ${describe({ ...tx, amount: Number(tx.amount) }, result.transactions[i].categoryName)}`, {
        reply_markup: txKeyboard(tx.id),
      });
    }
  });

  bot.on("message", (ctx) => ctx.reply("Por enquanto eu entendo só mensagens de texto. 🙂"));

  // Botões
  bot.callbackQuery(/^undo:(.+)$/, async (ctx) => {
    const link = await getLink(db, ctx);
    if (!link) return ctx.answerCallbackQuery("Não conectado.");
    const { data } = await db
      .from("transactions")
      .delete()
      .eq("id", ctx.match[1])
      .eq("household_id", link.household_id)
      .select("id");
    await ctx.answerCallbackQuery(data?.length ? "Desfeito" : "Já tinha sido removido");
    await ctx.editMessageText(`🗑️ ${ctx.callbackQuery.message?.text?.replace(/^✅ /, "") ?? "Lançamento"} (desfeito)`);
  });

  bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
    const link = await getLink(db, ctx);
    if (!link) return ctx.answerCallbackQuery("Não conectado.");
    const txId = ctx.match[1];
    const { data: tx } = await db
      .from("transactions")
      .select("kind")
      .eq("id", txId)
      .eq("household_id", link.household_id)
      .maybeSingle();
    if (!tx) return ctx.answerCallbackQuery("Lançamento não encontrado");

    const options = (await getCategories(db, link.household_id)).filter((c) => c.kind === tx.kind);
    const kb = new InlineKeyboard();
    options.forEach((c, i) => {
      kb.text(c.name, `sc:${txId}:${i}`);
      if (i % 3 === 2) kb.row();
    });
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: kb });
  });

  bot.callbackQuery(/^sc:(.+):(\d+)$/, async (ctx) => {
    const link = await getLink(db, ctx);
    if (!link) return ctx.answerCallbackQuery("Não conectado.");
    const [, txId, idx] = ctx.match;
    const { data: tx } = await db
      .from("transactions")
      .select("kind")
      .eq("id", txId)
      .eq("household_id", link.household_id)
      .maybeSingle();
    if (!tx) return ctx.answerCallbackQuery("Lançamento não encontrado");

    const options: Category[] = (await getCategories(db, link.household_id)).filter((c) => c.kind === tx.kind);
    const cat = options[Number(idx)];
    if (!cat) return ctx.answerCallbackQuery("Categoria inválida");

    const { data: updated } = await db
      .from("transactions")
      .update({ category_id: cat.id })
      .eq("id", txId)
      .eq("household_id", link.household_id)
      .select("kind, amount, occurred_on, description, payment_method")
      .single();
    await ctx.answerCallbackQuery(`Categoria: ${cat.name}`);
    if (updated) {
      await ctx.editMessageText(`✅ ${describe({ ...updated, amount: Number(updated.amount) }, cat.name)}`, {
        reply_markup: txKeyboard(txId),
      });
    }
  });

  bot.catch((err) => console.error("Erro no bot do Telegram", err.error));
  return bot;
}
