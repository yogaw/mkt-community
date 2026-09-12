import { formatCompact, formatPercentPlain, formatPrice, formatRupiah } from "@/features/stock-analysis/stock-analysis-format";
import type { StockProfile as StockProfileDto } from "@/features/stock-analysis/stock-analysis-types";

/**
 * What the app actually knows about a listing.
 *
 * Piranha ingests IDX's daily trading summary; it has no company registry. So
 * market data is real and company facts are absent — and absent is what they
 * are shown as. Filling a sector or a description from somewhere unverified
 * would put an unsourced claim about a real company on a paid research screen.
 */
export function StockProfile({ profile }: { profile: StockProfileDto }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-edge bg-panel p-5">
        <h2 className="text-base font-semibold text-ink">Company Overview</h2>
        <dl className="mt-4 space-y-3">
          <Row label="Ticker" value={profile.ticker} mono />
          <Row label="Company name" value={profile.name} />
          <Row label="Exchange" value={profile.exchange} />
          <Row label="Sector" value={profile.sector} />
          <Row label="Sub-sector" value={profile.subSector} />
          <Row label="Industry" value={profile.industry} />
          <Row label="Listing date" value={profile.listingDate} />
          <Row label="Website" value={profile.website} />
          <Row label="Headquarters" value={profile.headquarters} />
        </dl>
      </section>

      <section className="rounded-xl border border-edge bg-panel p-5">
        <h2 className="text-base font-semibold text-ink">Market Data</h2>
        <dl className="mt-4 space-y-3">
          <Row
            label="Market cap"
            value={profile.marketCap === null ? null : formatRupiah(profile.marketCap)}
          />
          <Row
            label="Shares outstanding"
            value={profile.listedShares === null ? null : formatCompact(profile.listedShares)}
          />
          <Row
            label="Tradeable shares"
            value={profile.tradeableShares === null ? null : formatCompact(profile.tradeableShares)}
          />
          <Row
            label="Free float"
            value={
              profile.freeFloatPercent === null ? null : formatPercentPlain(profile.freeFloatPercent)
            }
          />
          <Row
            label="Latest price"
            value={profile.lastPrice === null ? null : formatPrice(profile.lastPrice)}
          />
          <Row
            label="Period high"
            value={profile.yearHigh === null ? null : formatPrice(profile.yearHigh)}
          />
          <Row
            label="Period low"
            value={profile.yearLow === null ? null : formatPrice(profile.yearLow)}
          />
        </dl>
        <p className="mt-4 border-t border-edge pt-3 text-xs text-ink-faint">
          High and low cover the sessions the ingestion holds, which is less than a full year so
          far — so they are labelled period, not 52-week.
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-edge bg-panel p-5 lg:col-span-2">
        <h2 className="text-base font-semibold text-ink">Not available yet</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Piranha ingests IDX&rsquo;s daily trading summary, which carries prices and volumes but
          no company registry. These fields are left empty rather than filled from an unverified
          source:
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {profile.missingFields.map((field) => (
            <li key={field} className="flex gap-2.5 text-sm text-ink-muted">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />
              {field}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-edge pb-2 last:border-0 last:pb-0">
      <dt className="text-sm text-ink-faint">{label}</dt>
      <dd
        className={
          value === null
            ? "text-sm text-ink-faint"
            : `text-sm font-semibold text-ink ${mono ? "font-mono" : ""}`
        }
      >
        {value ?? "Not available"}
      </dd>
    </div>
  );
}
