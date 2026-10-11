import { webhookCallback } from "grammy";
import { createBot } from "@/lib/telegram/bot";

// A interpretação pela IA pode levar alguns segundos.
export const maxDuration = 30;

let handler: ((req: Request) => Promise<Response>) | null = null;

export async function POST(req: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Telegram não configurado", { status: 503 });
  }
  // Rejeita antes de qualquer chamada ao Telegram ou ao banco.
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  handler ??= webhookCallback(createBot(), "std/http", {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    timeoutMilliseconds: 25_000,
    onTimeout: "return",
  });
  return handler(req);
}
