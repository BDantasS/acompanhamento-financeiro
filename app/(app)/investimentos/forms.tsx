"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Field, Input, Select, cx } from "@/components/ui";
import { INVESTMENT_TYPES, type Investment } from "@/lib/investments";
import { addMovement, createInvestment, setSnapshot, type FormState } from "./actions";

function useResetOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.querySelectorAll<HTMLInputElement>("input[data-reset]").forEach((el) => (el.value = ""));
  }, [state.ok]);
  return ref;
}

function Feedback({ state, success }: { state: FormState; success: string }) {
  if (state.error) return <p className="text-sm text-expense">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-income">{success}</p>;
  return null;
}

const TABS = [
  { id: "movement", label: "Aporte / resgate" },
  { id: "snapshot", label: "Atualizar saldo" },
  { id: "new", label: "Novo investimento" },
] as const;

export function InvestmentForms({
  investments,
  today,
  month,
}: {
  investments: Investment[];
  today: string;
  month: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>(investments.length ? "movement" : "new");
  const [movState, movAction, movPending] = useActionState<FormState, FormData>(addMovement, {});
  const [snapState, snapAction, snapPending] = useActionState<FormState, FormData>(setSnapshot, {});
  const [newState, newAction, newPending] = useActionState<FormState, FormData>(createInvestment, {});
  const movRef = useResetOnSuccess(movState);
  const snapRef = useResetOnSuccess(snapState);
  const newRef = useResetOnSuccess(newState);
  const active = investments.filter((i) => !i.archived);

  const investmentSelect = (
    <Field label="Investimento">
      <Select name="investment_id" required>
        {active.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-background p-1 text-xs font-semibold">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            disabled={t.id !== "new" && active.length === 0}
            className={cx("h-9 rounded-lg disabled:opacity-40", tab === t.id ? "bg-surface shadow-sm" : "text-muted")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "movement" && (
        <form ref={movRef} action={movAction} className="flex flex-col gap-3">
          {investmentSelect}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select name="kind">
                <option value="deposit">Aporte</option>
                <option value="withdrawal">Resgate</option>
              </Select>
            </Field>
            <Field label="Valor (R$)">
              <Input name="amount" inputMode="decimal" placeholder="3.000,00" required data-reset />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input name="occurred_on" type="date" defaultValue={today} required />
            </Field>
            <Field label="Observação">
              <Input name="note" placeholder="Opcional" data-reset />
            </Field>
          </div>
          <Feedback state={movState} success="Movimento registrado ✓" />
          <Button disabled={movPending}>Registrar</Button>
        </form>
      )}

      {tab === "snapshot" && (
        <form ref={snapRef} action={snapAction} className="flex flex-col gap-3">
          <p className="text-xs text-muted">
            Informe o saldo que aparece na corretora/banco no fim do mês. É ele que alimenta a linha “Real” da projeção.
          </p>
          {investmentSelect}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mês">
              <Input name="month" type="month" defaultValue={month} required />
            </Field>
            <Field label="Saldo (R$)">
              <Input name="balance" inputMode="decimal" required data-reset />
            </Field>
          </div>
          <Feedback state={snapState} success="Saldo atualizado ✓" />
          <Button disabled={snapPending}>Salvar saldo</Button>
        </form>
      )}

      {tab === "new" && (
        <form ref={newRef} action={newAction} className="flex flex-col gap-3">
          <Field label="Nome">
            <Input name="name" placeholder="CDB Banco X 110% CDI" required data-reset />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select name="type">
                {INVESTMENT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Instituição">
              <Input name="institution" placeholder="Opcional" data-reset />
            </Field>
          </div>
          <Feedback state={newState} success="Investimento criado ✓" />
          <Button disabled={newPending}>Criar</Button>
        </form>
      )}
    </div>
  );
}
