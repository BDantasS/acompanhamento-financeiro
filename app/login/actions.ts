"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { step: "email" | "code"; email?: string; error?: string; info?: string };

export async function sendLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { step: "email", error: "Informe um e-mail válido." };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { step: "email", email, error: traduzir(error.message) };

  return {
    step: "code",
    email,
    info: "Enviamos um link de acesso para o seu e-mail. Abra o link ou digite o código recebido.",
  };
}

export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { step: "code", email, error: "Código inválido ou expirado." };
  redirect("/");
}

function traduzir(message: string) {
  if (/rate limit/i.test(message)) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return message;
}
