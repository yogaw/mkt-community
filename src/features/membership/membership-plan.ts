/**
 * Membership pricing.
 *
 * Money is held in whole rupiah as integers. Rupiah has no minor unit in
 * practice, and keeping it integral means the VAT line and the total are exact
 * rather than a float that rounds differently on the screen than it would on an
 * invoice.
 *
 * Nothing here charges anyone: checkout is not connected yet, so these figures
 * are for display and are recomputed server-side the day an order is real. A
 * price that only exists in the browser must never be the one that is billed.
 */
export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  /** Whole rupiah, excluding tax. */
  priceIdr: number;
  /** What one payment buys. */
  period: "month" | "year";
  features: string[];
}

/** PPN. Held as a named rate so a rate change is one edit, not a hunt. */
export const VAT_RATE = 0.11;

export const PREMIUM_PLAN: MembershipPlan = {
  id: "premium-monthly",
  name: "Premium Plan",
  description: "Full access to signals, analysis and the member community.",
  priceIdr: 800_000,
  period: "month",
  features: [
    "Real-time stock signals",
    "Exclusive video analysis",
    "Premium discussion access",
    "Advanced watchlist & tools",
  ],
};

export interface PriceBreakdown {
  subtotalIdr: number;
  vatIdr: number;
  totalIdr: number;
}

/**
 * VAT is rounded to the rupiah before it is added, so the three lines on screen
 * add up exactly. Computing the total from the unrounded tax would show a total
 * that does not equal subtotal + VAT as displayed.
 */
export function priceBreakdown(plan: MembershipPlan, vatRate = VAT_RATE): PriceBreakdown {
  const subtotalIdr = plan.priceIdr;
  const vatIdr = Math.round(subtotalIdr * vatRate);
  return { subtotalIdr, vatIdr, totalIdr: subtotalIdr + vatIdr };
}

/**
 * "Rp 800.000" — Indonesian grouping, no decimals.
 *
 * ICU renders the gap between symbol and digits as a non-breaking space in some
 * versions and a normal one in others; it is normalised so the output does not
 * change because Node was upgraded.
 */
export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/ /g, " ");
}

/** "per month" / "per year", for the line beside the price. */
export function periodLabel(plan: MembershipPlan): string {
  return plan.period === "month" ? "per month" : "per year";
}
