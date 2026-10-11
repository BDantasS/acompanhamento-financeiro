"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveTransaction, type TxFormState } from "@/app/(app)/lancamentos/actions";
import type { Category, Kind, Transaction } from "@/lib/finance";
import { PAYMENT_METHODS } from "@/lib/finance";
import { Button, Field, Input, Select, cx } from "./ui";

export function TransactionForm({
  categories,
  today,
  initial,
}: {
  categories: Category[];
  today: string;
  initial?: Transaction;
}) {
  const [state, action, pending] = useActionState<TxFormState, FormData>(saveTransaction, {});
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "expense");
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Depois de salvar um novo lançamento, limpa valor/descrição e volta o foco ao valor.
  useEffect(() => {
    if (state.ok && !initial) {
      formRef.current?.querySelectorAll<HTMLInputElement>("input[data-reset]").forEach((el) => (el.value = ""));
      amountRef.current?.focus();
    }
  }, [state.ok, initial]);

  const options = categories.filter((c) => c.kind === kind);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="kind" value={kind} />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-background p-1 text-sm font-semibold">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cx(
              "h-9 rounded-lg",
              kind === k ? (k === "expense" ? "bg-surface text-expense shadow-sm" : "bg-surface text-income shadow-sm") : "text-muted",
            )}
          >
            {k === "expense" ? "Despesa" : "Receita / pró-labore"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)">
          <Input
            ref={amountRef}
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            required
            data-reset
            defaultValue={initial ? String(initial.amount).replace(".", ",") : ""}
          />
        </Field>
        <Field label="Data">
          <Input name="occurred_on" type="date" required defaultValue={initial?.occurred_on ?? today} />
        </Field>
      </div>

      <Field label="Categoria">
        <Select key={kind} name="category_id" defaultValue={initial?.kind === kind ? (initial.category_id ?? "") : ""}>
          <option value="">Sem categoria</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Forma de pagamento">
          <Select name="payment_method" defaultValue={initial?.payment_method ?? ""}>
            <option value="">—</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição">
          <Input name="description" placeholder="Opcional" data-reset defaultValue={initial?.description ?? ""} />
        </Field>
      </div>

      {state.error && <p className="text-sm text-expense">{state.error}</p>}
      {state.ok && !initial && <p className="text-sm text-income">Lançamento salvo ✓</p>}
      <Button disabled={pending}>{pending ? "Salvando…" : initial ? "Salvar alterações" : "Adicionar"}</Button>
    </form>
  );
}
