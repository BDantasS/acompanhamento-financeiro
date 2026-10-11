"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input, cx } from "@/components/ui";
import { createHousehold, joinHousehold, type OnboardingState } from "./actions";

export function OnboardingForms() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [createState, createAction, creating] = useActionState<OnboardingState, FormData>(createHousehold, {});
  const [joinState, joinAction, joining] = useActionState<OnboardingState, FormData>(joinHousehold, {});

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-background p-1 text-sm font-medium">
        {(["create", "join"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cx("h-9 rounded-lg", mode === m ? "bg-surface shadow-sm" : "text-muted")}
          >
            {m === "create" ? "Criar família" : "Tenho um código"}
          </button>
        ))}
      </div>

      {mode === "create" ? (
        <form action={createAction} className="flex flex-col gap-3">
          <Field label="Nome da família">
            <Input name="household" placeholder="Família Silva" required />
          </Field>
          <Field label="Seu nome">
            <Input name="name" required />
          </Field>
          {createState.error && <p className="text-sm text-expense">{createState.error}</p>}
          <Button disabled={creating}>{creating ? "Criando…" : "Criar"}</Button>
        </form>
      ) : (
        <form action={joinAction} className="flex flex-col gap-3">
          <Field label="Código de convite">
            <Input name="code" placeholder="A1B2C3D4" className="uppercase" required />
          </Field>
          <Field label="Seu nome">
            <Input name="name" required />
          </Field>
          {joinState.error && <p className="text-sm text-expense">{joinState.error}</p>}
          <Button disabled={joining}>{joining ? "Entrando…" : "Entrar na família"}</Button>
        </form>
      )}
    </div>
  );
}
