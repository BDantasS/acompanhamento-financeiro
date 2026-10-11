import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Member = { user_id: string; display_name: string; role: string };
export type Household = { id: string; name: string; invite_code: string };

/** Usuário logado (ou redireciona para /login). */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

/**
 * Usuário + família. Quem ainda não tem família vai para /onboarding.
 * Toda tela e server action do app passa por aqui.
 */
export const getContext = cache(async () => {
  const { supabase, user } = await getUser();

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, households(id, name, invite_code)")
    .eq("user_id", user.id)
    .maybeSingle();

  const household = membership?.households as unknown as Household | null;
  if (!household) redirect("/onboarding");

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, display_name, role")
    .eq("household_id", household.id)
    .order("created_at");

  return {
    supabase,
    user,
    household,
    members: (members ?? []) as Member[],
  };
});
