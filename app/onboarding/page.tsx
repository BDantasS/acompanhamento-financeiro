import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getUser } from "@/lib/session";
import { OnboardingForms } from "./forms";

export default async function OnboardingPage() {
  const { supabase, user } = await getUser();
  const { data } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">Bem-vindo(a)!</h1>
        <p className="mt-1 text-sm text-muted">
          Crie a conta da família, ou entre com o código de convite que seu(sua) parceiro(a) vê em Configurações.
        </p>
      </div>
      <Card>
        <OnboardingForms />
      </Card>
    </main>
  );
}
