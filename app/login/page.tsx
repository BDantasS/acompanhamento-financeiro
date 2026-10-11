"use client";

import { useActionState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { sendLink, verifyCode, type LoginState } from "./actions";

export default function LoginPage() {
  const [sendState, sendAction, sending] = useActionState<LoginState, FormData>(sendLink, { step: "email" });
  const [codeState, codeAction, verifying] = useActionState<LoginState, FormData>(verifyCode, { step: "code" });

  const showCode = sendState.step === "code";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-white">
            R$
          </div>
          <h1 className="text-xl font-bold">Finanças da Família</h1>
          <p className="mt-1 text-sm text-muted">Entre com seu e-mail</p>
        </div>

        {!showCode ? (
          <form action={sendAction} className="flex flex-col gap-3">
            <Field label="E-mail">
              <Input name="email" type="email" autoComplete="email" required defaultValue={sendState.email} />
            </Field>
            {sendState.error && <p className="text-sm text-expense">{sendState.error}</p>}
            <Button disabled={sending}>{sending ? "Enviando…" : "Receber link de acesso"}</Button>
          </form>
        ) : (
          <form action={codeAction} className="flex flex-col gap-3">
            <p className="text-sm text-muted">{sendState.info}</p>
            <input type="hidden" name="email" value={sendState.email} />
            <Field label="Código do e-mail">
              <Input name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required />
            </Field>
            {codeState.error && <p className="text-sm text-expense">{codeState.error}</p>}
            <Button disabled={verifying}>{verifying ? "Verificando…" : "Entrar"}</Button>
          </form>
        )}
      </Card>
    </main>
  );
}
