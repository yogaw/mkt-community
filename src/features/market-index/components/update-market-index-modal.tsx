"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getToken } from "@/lib/auth/token-storage";
import { humanizeErrorCode } from "@/lib/errors/error-messages";
import { formatRupiahShort } from "@/lib/datetime/rupiah";
import type { MarketIndexSnapshotDto } from "@/features/market-index/market-index-types";

type FieldErrors = Record<string, string>;

/**
 * Turnover and flow are entered the way they are quoted — "8.4T", "-640B" —
 * and expanded to whole rupiah before they are sent, so the stored number
 * carries no formatting.
 */
const SUFFIX_MULTIPLIER: Record<string, number> = { t: 1e12, b: 1e9, m: 1e6, k: 1e3 };

export function parseRupiahInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/rp/i, "").replace(/[\s,]/g, "");
  const match = /^(-?\d+(?:\.\d+)?)([tbmk])?$/i.exec(cleaned);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  const multiplier = match[2] ? SUFFIX_MULTIPLIER[match[2].toLowerCase()] : 1;
  return amount * multiplier;
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 16);
}

interface UpdateMarketIndexModalProps {
  open: boolean;
  latest: MarketIndexSnapshotDto | null;
  onClose: () => void;
  onSaved: (snapshot: MarketIndexSnapshotDto) => void;
}

export function UpdateMarketIndexModal({
  open,
  latest,
  onClose,
  onSaved,
}: UpdateMarketIndexModalProps) {
  // Seeded from the last posted snapshot, since most fields move only a little.
  const [indexName, setIndexName] = useState(latest?.indexName ?? "IHSG");
  const [value, setValue] = useState(latest ? String(latest.value) : "");
  const [changePercent, setChangePercent] = useState(latest ? String(latest.changePercent) : "");
  const [turnover, setTurnover] = useState("");
  const [foreignFlow, setForeignFlow] = useState("");
  const [advancers, setAdvancers] = useState(latest ? String(latest.advancers) : "");
  const [decliners, setDecliners] = useState(latest ? String(latest.decliners) : "");
  const [capturedAt, setCapturedAt] = useState(todayInputValue());

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const turnoverIdr = parseRupiahInput(turnover);
  const foreignFlowIdr = parseRupiahInput(foreignFlow);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: FieldErrors = {};
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
      errors.value = "Enter the index level, e.g. 7845.21.";
    }
    if (!Number.isFinite(Number(changePercent))) {
      errors.changePercent = "Enter the day's change, e.g. 0.72 or -1.10.";
    }
    if (turnoverIdr === null || turnoverIdr < 0) {
      errors.turnover = 'Enter an amount like "8.4T".';
    }
    if (foreignFlowIdr === null) {
      errors.foreignFlow = 'Enter an amount like "640B" or "-320B".';
    }
    for (const [key, raw] of Object.entries({ advancers, decliners })) {
      if (!Number.isInteger(Number(raw)) || Number(raw) < 0 || raw.trim() === "") {
        errors[key] = "Enter a whole number.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
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
      const response = await fetch("/api/v1/market-index", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          indexName,
          value: Number(value),
          changePercent: Number(changePercent),
          turnoverIdr,
          foreignFlowIdr,
          advancers: Number(advancers),
          decliners: Number(decliners),
          capturedAt: new Date(capturedAt).toISOString(),
        }),
      });

      if (!response.ok) {
        setFormError(
          response.status === 403
            ? humanizeErrorCode("general.error.forbidden")
            : humanizeErrorCode("general.error.validation"),
        );
        return;
      }

      const body = (await response.json()) as { data: MarketIndexSnapshotDto };
      onSaved(body.data);
    } catch {
      setFormError(humanizeErrorCode("general.error.server_error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      title="Post index snapshot"
      description="Each post is kept, so the home page always shows the most recent close."
    >
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5" noValidate>
        {formError ? <Alert>{formError}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Index" value={indexName} onChange={(e) => setIndexName(e.target.value.toUpperCase())} maxLength={20} />
          <Input label="Level" inputMode="decimal" placeholder="7845.21" value={value} onChange={(e) => setValue(e.target.value)} error={fieldErrors.value} />
          <Input label="Change %" inputMode="decimal" placeholder="0.72" value={changePercent} onChange={(e) => setChangePercent(e.target.value)} error={fieldErrors.changePercent} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Turnover"
            placeholder="8.4T"
            value={turnover}
            onChange={(e) => setTurnover(e.target.value)}
            error={fieldErrors.turnover}
          />
          <Input
            label="Foreign net flow"
            placeholder="640B or -320B"
            value={foreignFlow}
            onChange={(e) => setForeignFlow(e.target.value)}
            error={fieldErrors.foreignFlow}
          />
        </div>

        {turnoverIdr !== null || foreignFlowIdr !== null ? (
          <p className="rounded-lg border border-edge bg-panel-raised/50 px-3 py-2 text-xs text-ink-muted">
            Will be stored as{" "}
            <span className="font-semibold text-ink">
              {turnoverIdr === null ? "—" : formatRupiahShort(turnoverIdr)}
            </span>{" "}
            turnover and{" "}
            <span className="font-semibold text-ink">
              {foreignFlowIdr === null ? "—" : formatRupiahShort(foreignFlowIdr)}
            </span>{" "}
            net flow.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Advancers" inputMode="numeric" placeholder="312" value={advancers} onChange={(e) => setAdvancers(e.target.value)} error={fieldErrors.advancers} />
          <Input label="Decliners" inputMode="numeric" placeholder="221" value={decliners} onChange={(e) => setDecliners(e.target.value)} error={fieldErrors.decliners} />
          <Input label="As of" type="datetime-local" value={capturedAt} onChange={(e) => setCapturedAt(e.target.value)} />
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-3 border-t border-edge bg-panel px-5 py-4">
          <div className="shrink-0">
            <Button type="button" variant="secondary" className="px-5" disabled={isSubmitting} onClick={onClose}>
              Cancel
            </Button>
          </div>
          <div className="shrink-0">
            <Button type="submit" className="px-5" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save snapshot"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
