import { X } from "lucide-react";
import { Button, Card, CardTitle, Input, PageHeader, Select } from "@/components/ui";
import { getCategories } from "@/lib/finance";
import { getContext } from "@/lib/session";
import { addCategory, deleteCategory, renameMember, unlinkTelegram } from "./actions";
import { TelegramLinker } from "./telegram";

export default async function ConfiguracoesPage() {
  const { supabase, user, household, members } = await getContext();
  const [categories, { data: links }] = await Promise.all([
    getCategories(supabase, household.id),
    supabase.from("telegram_links").select("telegram_user_id, telegram_name").eq("user_id", user.id),
  ]);
  const me = members.find((m) => m.user_id === user.id);

  return (
    <>
      <PageHeader title="Ajustes" subtitle={user.email} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Família</CardTitle>
          <p className="text-sm">
            Para sua esposa (ou outra pessoa) usar a mesma conta, ela entra no app com o próprio e-mail e informa este código:
          </p>
          <p className="mt-2 select-all rounded-xl bg-accent-soft p-3 text-center font-mono text-xl font-bold tracking-widest text-accent">
            {household.invite_code}
          </p>
          <ul className="mt-4 divide-y divide-border text-sm">
            {members.map((m) => (
              <li key={m.user_id} className="flex justify-between py-2">
                <span>{m.display_name}</span>
                <span className="text-xs text-muted">{m.role === "owner" ? "criou a conta" : "membro"}</span>
              </li>
            ))}
          </ul>
          <form action={renameMember} className="mt-3 flex gap-2">
            <Input name="name" defaultValue={me?.display_name} aria-label="Seu nome" />
            <Button variant="secondary">Renomear</Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Telegram</CardTitle>
          <TelegramLinker botUsername={process.env.TELEGRAM_BOT_USERNAME} />
          {links && links.length > 0 && (
            <ul className="mt-4 divide-y divide-border border-t border-border text-sm">
              {links.map((l) => (
                <li key={l.telegram_user_id} className="flex items-center justify-between py-2">
                  <span>✅ Conectado: {l.telegram_name || l.telegram_user_id}</span>
                  <form action={unlinkTelegram}>
                    <input type="hidden" name="telegram_user_id" value={l.telegram_user_id} />
                    <Button variant="danger" className="h-8 px-2">Desconectar</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Categorias</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["expense", "income"] as const).map((kind) => (
              <div key={kind}>
                <p className="mb-2 text-xs font-semibold text-muted">{kind === "expense" ? "Despesas" : "Receitas"}</p>
                <div className="flex flex-wrap gap-2">
                  {categories
                    .filter((c) => c.kind === kind)
                    .map((c) => (
                      <form key={c.id} action={deleteCategory} className="flex items-center gap-1 rounded-full border border-border py-1 pr-1 pl-3 text-sm">
                        <input type="hidden" name="id" value={c.id} />
                        {c.name}
                        <button className="rounded-full p-0.5 text-muted hover:text-expense" aria-label={`Remover ${c.name}`}>
                          <X size={14} />
                        </button>
                      </form>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <form action={addCategory} className="mt-4 flex flex-wrap gap-2">
            <Input name="name" placeholder="Nova categoria" className="max-w-56" required />
            <Select name="kind" className="max-w-40">
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </Select>
            <Button variant="secondary">Adicionar</Button>
          </form>
        </Card>
      </div>

      <form action="/auth/signout" method="post" className="mt-6">
        <Button variant="ghost">Sair da conta</Button>
      </form>
    </>
  );
}
