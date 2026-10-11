"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";

export type OnboardingState = { error?: string };

export async function createHousehold(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const name = String(formData.get("household") ?? "").trim();
  const displayName = String(formData.get("name") ?? "").trim();
  if (!name || !displayName) return { error: "Preencha os dois campos." };

  const { supabase } = await getUser();
  const { error } = await supabase.rpc("create_household", { p_name: name, p_display_name: displayName });
  if (error) return { error: error.message };
  redirect("/");
}

export async function joinHousehold(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const code = String(formData.get("code") ?? "").trim();
  const displayName = String(formData.get("name") ?? "").trim();
  if (!code || !displayName) return { error: "Preencha os dois campos." };

  const { supabase } = await getUser();
  const { error } = await supabase.rpc("join_household", { p_code: code, p_display_name: displayName });
  if (error) return { error: error.message };
  redirect("/");
}
