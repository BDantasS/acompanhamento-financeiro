"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { createTelegramCode, registerWebhook } from "./actions";

export function TelegramLinker({ botUsername }: { botUsername?: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <ol className="list-decimal pl-5 text-sm text-muted">
        <li>
          Abra o bot no Telegram
          {botUsername && (
            <>
              {" "}
              (
              <a className="font-medium text-accent" href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
                @{botUsername}
              </a>
              )
            </>
          )}
          .
        </li>
        <li>Gere um código abaixo e envie para o bot: <code>/vincular CÓDIGO</code></li>
      </ol>

      {code ? (
        <div className="rounded-xl bg-accent-soft p-3 text-center">
          <p className="text-xs text-muted">Envie para o bot (vale 15 minutos):</p>
          <p className="mt-1 select-all font-mono text-lg font-bold text-accent">/vincular {code}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createTelegramCode();
              if (res.code) setCode(res.code);
              setMsg(res.error ?? null);
            })
          }
        >
          {code ? "Gerar outro código" : "Gerar código"}
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          title="Faça uma vez, depois de publicar o app"
          onClick={() =>
            start(async () => {
              const res = await registerWebhook();
              setMsg(res.ok ? "Webhook do bot configurado ✓" : (res.error ?? null));
            })
          }
        >
          Configurar webhook
        </Button>
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
