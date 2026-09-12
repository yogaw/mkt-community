"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { getToken } from "@/lib/auth/token-storage";
import { humanizeErrorCode } from "@/lib/errors/error-messages";
import type { ApiErrorBody } from "@/lib/api/response";
import {
  signalPositionSizeLabel,
  signalRiskLabel,
  signalStatusLabel,
  signalTypeLabel,
} from "@/features/signals/signal-display";
import type { SignalDetailDto } from "@/features/signals/signal-types";

type FieldErrors = Record<string, string>;

const emptyForm = {
  ticker: "",
  companyName: "",
  type: "SWING",
  status: "ACTIVE",
  riskLevel: "MEDIUM",
  positionSize: "NORMAL",
  entryLow: "",
  entryHigh: "",
  currentPrice: "",
  target1: "",
  target2: "",
  stopLoss: "",
  timeHorizon: "",
  issuedAt: "",
  thesis: "",
  keyCatalysts: "",
};

type FormState = typeof emptyForm;

const controlClass =
  "w-full rounded-lg border border-edge bg-panel-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-muted">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-xs text-down">{error}</p> : null}
    </div>
  );
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Mirrors the schema's refinements so the trader sees what is wrong with the
 * levels straight away. The route re-validates; this is only for the message.
 */
function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const num = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));

  if (form.ticker.trim().length < 2) errors.ticker = "Enter a ticker.";
  if (form.companyName.trim().length < 2) errors.companyName = "Enter the company name.";
  if (form.timeHorizon.trim().length < 2) errors.timeHorizon = "Enter a time horizon.";
  if (form.thesis.trim().length < 10) errors.thesis = "Write at least a sentence of thesis.";

  const entryLow = num(form.entryLow);
  const entryHigh = num(form.entryHigh);
  const currentPrice = num(form.currentPrice);
  const target1 = num(form.target1);
  const stopLoss = num(form.stopLoss);
  const hasTarget2 = form.target2.trim() !== "";
  const target2 = num(form.target2);

  for (const [key, value] of Object.entries({ entryLow, entryHigh, currentPrice, target1, stopLoss })) {
    if (!Number.isFinite(value) || value <= 0) errors[key] = "Enter a price above 0.";
  }
  if (hasTarget2 && (!Number.isFinite(target2) || target2 <= 0)) {
    errors.target2 = "Enter a price above 0.";
  }

  if (!errors.entryHigh && !errors.entryLow && entryHigh < entryLow) {
    errors.entryHigh = "Entry high must be at or above entry low.";
  }
  if (!errors.target1 && !errors.entryHigh && target1 <= entryHigh) {
    errors.target1 = "Target 1 must be above the entry range.";
  }
  if (!errors.target2 && hasTarget2 && !errors.target1 && target2 <= target1) {
    errors.target2 = "Target 2 must be above target 1.";
  }
  if (!errors.stopLoss && !errors.entryLow && stopLoss >= entryLow) {
    errors.stopLoss = "Stop loss must be below the entry range.";
  }

  return errors;
}

interface AddSignalModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (signal: SignalDetailDto) => void;
}

export function AddSignalModal({ open, onClose, onCreated }: AddSignalModalProps) {
  const [form, setForm] = useState<FormState>({ ...emptyForm, issuedAt: todayInputValue() });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }
    setForm({ ...emptyForm, issuedAt: todayInputValue() });
    setFieldErrors({});
    setFormError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    const token = getToken();
    if (!token) {
      setFormError(humanizeErrorCode("general.error.unauthorized"));
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const response = await fetch("/api/v1/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ticker: form.ticker,
          companyName: form.companyName,
          type: form.type,
          status: form.status,
          riskLevel: form.riskLevel,
          positionSize: form.positionSize,
          entryLow: Number(form.entryLow),
          entryHigh: Number(form.entryHigh),
          currentPrice: Number(form.currentPrice),
          target1: Number(form.target1),
          target2: form.target2.trim() === "" ? null : Number(form.target2),
          stopLoss: Number(form.stopLoss),
          timeHorizon: form.timeHorizon,
          thesis: form.thesis,
          keyCatalysts: form.keyCatalysts
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          issuedAt: form.issuedAt,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        applyApiErrors(body?.error, setFormError, setFieldErrors);
        return;
      }

      onCreated((body as { data: SignalDetailDto }).data);
      setForm({ ...emptyForm, issuedAt: todayInputValue() });
      onClose();
    } catch {
      setFormError(humanizeErrorCode("general.error.server_error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Signal"
      description="Publish a new trade idea to the community."
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5" noValidate>
        {formError ? <Alert>{formError}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Ticker"
            placeholder="CUAN"
            value={form.ticker}
            onChange={(event) => update("ticker", event.target.value.toUpperCase())}
            error={fieldErrors.ticker}
            maxLength={10}
          />
          <Input
            label="Company Name"
            placeholder="Petrindo Jaya Kreasi Tbk"
            value={form.companyName}
            onChange={(event) => update("companyName", event.target.value)}
            error={fieldErrors.companyName}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Type" error={fieldErrors.type}>
            {(id) => (
              <select id={id} className={controlClass} value={form.type} onChange={(e) => update("type", e.target.value)}>
                {Object.entries(signalTypeLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Status" error={fieldErrors.status}>
            {(id) => (
              <select id={id} className={controlClass} value={form.status} onChange={(e) => update("status", e.target.value)}>
                {Object.entries(signalStatusLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Risk Level" error={fieldErrors.riskLevel}>
            {(id) => (
              <select id={id} className={controlClass} value={form.riskLevel} onChange={(e) => update("riskLevel", e.target.value)}>
                {Object.entries(signalRiskLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Position Size" error={fieldErrors.positionSize}>
            {(id) => (
              <select id={id} className={controlClass} value={form.positionSize} onChange={(e) => update("positionSize", e.target.value)}>
                {Object.entries(signalPositionSizeLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Entry Low" inputMode="numeric" placeholder="1500" value={form.entryLow} onChange={(e) => update("entryLow", e.target.value)} error={fieldErrors.entryLow} />
          <Input label="Entry High" inputMode="numeric" placeholder="1550" value={form.entryHigh} onChange={(e) => update("entryHigh", e.target.value)} error={fieldErrors.entryHigh} />
          <Input label="Current Price" inputMode="numeric" placeholder="1650" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} error={fieldErrors.currentPrice} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Target 1" inputMode="numeric" placeholder="1700" value={form.target1} onChange={(e) => update("target1", e.target.value)} error={fieldErrors.target1} />
          <Input label="Target 2 (optional)" inputMode="numeric" placeholder="1850" value={form.target2} onChange={(e) => update("target2", e.target.value)} error={fieldErrors.target2} />
          <Input label="Stop Loss" inputMode="numeric" placeholder="1420" value={form.stopLoss} onChange={(e) => update("stopLoss", e.target.value)} error={fieldErrors.stopLoss} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Time Horizon" placeholder="1 – 4 weeks" value={form.timeHorizon} onChange={(e) => update("timeHorizon", e.target.value)} error={fieldErrors.timeHorizon} />
          <Input label="Issued On" type="date" value={form.issuedAt} onChange={(e) => update("issuedAt", e.target.value)} error={fieldErrors.issuedAt} />
        </div>

        <Field label="Thesis" error={fieldErrors.thesis}>
          {(id) => (
            <textarea
              id={id}
              rows={4}
              className={cn(controlClass, "resize-y")}
              placeholder="Why this trade, and what has to stay true for it to work."
              value={form.thesis}
              onChange={(e) => update("thesis", e.target.value)}
            />
          )}
        </Field>

        <Field label="Key Catalysts (one per line)" error={fieldErrors.keyCatalysts}>
          {(id) => (
            <textarea
              id={id}
              rows={4}
              className={cn(controlClass, "resize-y")}
              placeholder={"Breakout above major resistance at 1,550\nIncreasing trading volume"}
              value={form.keyCatalysts}
              onChange={(e) => update("keyCatalysts", e.target.value)}
            />
          )}
        </Field>

        {/* Pinned to the bottom of the scroll area so Publish stays reachable
            without scrolling past a long thesis. */}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap justify-end gap-3 border-t border-edge bg-panel px-5 py-4">
          <div className="shrink-0">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting} className="px-5">
              Cancel
            </Button>
          </div>
          <div className="shrink-0">
            <Button type="submit" disabled={isSubmitting} className="px-5">
              {isSubmitting ? "Publishing…" : "Publish Signal"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function applyApiErrors(
  errors: ApiErrorBody[] | undefined,
  setFormError: (message: string | null) => void,
  setFieldErrors: (errors: FieldErrors) => void,
): void {
  const fields: FieldErrors = {};
  let general: string | null = null;

  for (const item of errors ?? []) {
    const [target] = item.path;
    if (target === "general") {
      general = humanizeErrorCode(item.message);
    } else {
      fields[target] = humanizeErrorCode(item.message);
    }
  }

  setFieldErrors(fields);
  setFormError(general);
}
