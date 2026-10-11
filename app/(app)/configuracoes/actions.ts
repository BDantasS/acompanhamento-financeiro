"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";

export async function createTelegramCode(): Promise<{ code?: string; error?: string }> {
  const { supabase, user, household } = await getContext();
  // Sem caracteres ambíguos (0/O, 1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = [...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join("");

  await supabase.from("telegram_link_codes").delete().eq("user_id", user.id);
  const { error } = await supabase.from("telegram_link_codes").insert({ code, user_id: user.id, household_id: household.id });
  return error ? { error: error.message } : { code };
}

export async function unlinkTelegram(formData: FormData) {
  const { supabase } = await getContext();
  await supabase.from("telegram_links").delete().eq("telegram_user_id", Number(formData.get("telegram_user_id")));
  revalidatePath("/configuracoes");
}

/** Registra no Telegram a URL deste app como webhook do bot. */
export async function registerWebhook(): Promise<{ ok?: boolean; error?: string }> {
  await getContext();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return { error: "Defina TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET no servidor." };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host || host.startsWith("localhost")) {
    return { error: "O Telegram precisa de uma URL pública com HTTPS. Faça isso pelo app publicado (ou por um túnel)." };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: `https://${host}/api/telegram`,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
    }),
  });
  const body = (await res.json()) as { ok: boolean; description?: string };
  return body.ok ? { ok: true } : { error: body.description ?? "Falha ao registrar webhook." };
}

export async function addCategory(formData: FormData) {
  const { supabase, household } = await getContext();
  const name = String(formData.get("name") ?? "").trim();
  const kind = formData.get("kind") === "income" ? "income" : "expense";
  if (name) await supabase.from("categories").insert({ household_id: household.id, name, kind });
  revalidatePath("/", "layout");
}

export async function deleteCategory(formData: FormData) {
  const { supabase, household } = await getContext();
  await supabase.from("categories").delete().eq("id", String(formData.get("id"))).eq("household_id", household.id);
  revalidatePath("/", "layout");
}

export async function renameMember(formData: FormData) {
  const { supabase, user, household } = await getContext();
  const name = String(formData.get("name") ?? "").trim();
  if (name) {
    await supabase.from("household_members").update({ display_name: name }).eq("household_id", household.id).eq("user_id", user.id);
  }
  revalidatePath("/", "layout");
}
