"use client";

import { useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/cn";
import {
  PREMIUM_PLAN,
  VAT_RATE,
  formatIdr,
  periodLabel,
  priceBreakdown,
} from "@/features/membership/membership-plan";

/*
 * Checkout is not connected. Every control that would move money is inert and
 * says so, rather than looking live and quietly doing nothing — a payment
 * screen that appears to work is worse than one that admits it does not.
 *
 * There is deliberately no card-number field. Taking a PAN directly puts this
 * application in PCI-DSS scope; the providers used in Indonesia expect a method
 * choice here and collect the instrument themselves on a hosted page or through
 * a tokenising SDK. This screen chooses a method and nothing more.
 */

type MethodId = "card" | "va" | "ewallet" | "qris";

interface PaymentMethod {
  id: MethodId;
  label: string;
  detail: string;
  icon: ReactNode;
}

const METHODS: PaymentMethod[] = [
  { id: "card", label: "Credit / Debit Card", detail: "Visa, Mastercard, JCB", icon: <CardIcon /> },
  { id: "va", label: "Virtual Account", detail: "BCA, Mandiri, BNI, BRI, CIMB, Permata", icon: <BankIcon /> },
  { id: "ewallet", label: "E-Wallet", detail: "GoPay, OVO, DANA, LinkAja, ShopeePay", icon: <WalletIcon /> },
  { id: "qris", label: "QRIS", detail: "Scan with any e-wallet app", icon: <QrIcon /> },
];

interface UpgradeMembershipDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeMembershipDrawer({ open, onClose }: UpgradeMembershipDrawerProps) {
  const [method, setMethod] = useState<MethodId>("card");
  const plan = PREMIUM_PLAN;
  const price = priceBreakdown(plan);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Upgrade Membership"
      description="Get more insights, signals, and exclusive content."
      footer={
        <div className="space-y-3">
          <Button disabled className="w-full justify-between px-5">
            <span className="flex items-center gap-2">
              <LockIcon />
              Pay Now
            </span>
            <span>{formatIdr(price.totalIdr)}</span>
          </Button>
          <p className="text-center text-xs text-ink-faint">
            Checkout is not connected yet — no payment is taken.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <Alert variant="info">
          This is the checkout layout only. Connecting a payment provider is a separate
          piece of work, so nothing here charges a card or changes your membership.
        </Alert>

        <Section step={1} title="Plan summary">
          <div className="rounded-xl border border-edge bg-panel-raised/40 p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-warn/10 p-2 text-warn">
                <CrownIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{plan.name}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{plan.description}</p>
              </div>
            </div>

            <dl className="mt-4 space-y-2 border-t border-edge pt-4 text-sm">
              <Line label={`Price (1 ${plan.period})`} value={formatIdr(price.subtotalIdr)} />
              <Line
                label={`VAT ${(VAT_RATE * 100).toFixed(0)}%`}
                value={formatIdr(price.vatIdr)}
              />
              <div className="flex items-center justify-between border-t border-edge pt-2">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="text-lg font-semibold tracking-tight text-ink">
                  {formatIdr(price.totalIdr)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-ink-faint">
              Billed {periodLabel(plan)}. Cancel any time.
            </p>
          </div>
        </Section>

        <Section step={2} title="Promo code" hint="optional">
          <div className="flex gap-2">
            <input
              type="text"
              disabled
              placeholder="Enter promo code"
              aria-label="Promo code"
              className={cn(
                "w-full rounded-lg border border-edge bg-panel-raised px-3 py-2.5 text-sm text-ink",
                "placeholder:text-ink-faint focus:border-accent focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            />
            <button
              type="button"
              disabled
              className="shrink-0 rounded-lg border border-edge bg-panel-raised px-4 text-sm font-semibold text-ink-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-faint">
            Codes are validated by the payment service, which is not wired up yet.
          </p>
        </Section>

        <Section step={3} title="Payment method">
          <fieldset>
            <legend className="sr-only">Payment method</legend>
            <div className="space-y-2">
              {METHODS.map((option) => {
                const isSelected = option.id === method;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-edge bg-panel hover:border-ink-faint",
                    )}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => setMethod(option.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        isSelected ? "border-accent" : "border-ink-faint",
                      )}
                    >
                      {isSelected ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
                    </span>
                    <span className="shrink-0 text-ink-muted">{option.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{option.label}</span>
                      <span className="block text-xs text-ink-faint">{option.detail}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <p className="mt-2 text-xs text-ink-faint">
            Card details are never entered here — the provider collects them on its own
            secure page.
          </p>
        </Section>

        <p className="flex items-center justify-center gap-2 text-xs text-ink-faint">
          <ShieldIcon />
          Payments will be processed over an encrypted connection.
        </p>
      </div>
    </Drawer>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-ink">
        {step}. {title}
        {hint ? <span className="ml-1 font-normal text-ink-faint">({hint})</span> : null}
      </h3>
      {children}
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

function CrownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M2 5l2.6 2.2L8 3l3.4 4.2L14 5l-1 7H3L2 5z" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="4.5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 8.5h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function BankIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3l7 3.5H3L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 9v5M10 9v5M15 9v5M3 16.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 10h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function QrIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 11.5h2v2h-2zM15.5 15.5h1.5v1.5h-1.5z" fill="currentColor" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5.5a2.5 2.5 0 015 0V7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.8l5.2 2.1v3.8c0 3-2.2 5.3-5.2 6.4-3-1.1-5.2-3.4-5.2-6.4V3.9L8 1.8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
