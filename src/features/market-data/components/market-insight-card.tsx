import type { MarketSection } from "@/features/market-data/market-data-model";

/**
 * Editorial commentary, written by the desk.
 *
 * Static on purpose: there is no editorial backend yet, and generating market
 * commentary automatically would put words in the desk's mouth. The shape here
 * is what that backend should return — headline, badge, timestamp, body,
 * takeaways — so wiring it up later is a fetch, not a redesign.
 */
export interface MarketInsight {
  headline: string;
  badge: string;
  publishedAt: string;
  body: string;
  takeaways: string[];
}

export const SECTION_INSIGHT: Record<MarketSection, MarketInsight> = {
  global: {
    headline: "Dollar holds firm as markets weigh the Fed's next move",
    badge: "Macro View",
    publishedAt: "11 Sep 2026",
    body:
      "The dollar index held its ground while the ten-year yield stayed near the top of its recent range, a combination that usually keeps a lid on emerging-market risk appetite. Equity futures were firmer, and volatility eased back after a jumpy fortnight. For Indonesian investors the read-through runs through the rupiah: a firm dollar and elevated US yields are what pull foreign money out of Jakarta, and both are still in place.",
    takeaways: [
      "Dollar steady; US ten-year holding near the upper end of its range",
      "Volatility easing after a jumpy fortnight",
      "Elevated US yields keep pressure on emerging-market currencies",
      "Watch the rupiah as the transmission channel into IDX flows",
    ],
  },
  indonesia: {
    headline: "IHSG gives back ground as foreign investors keep selling",
    badge: "Market View",
    publishedAt: "11 Sep 2026",
    body:
      "The composite closed lower with foreign investors net sellers again in the regular market, continuing a pattern that has run for several sessions. Turnover stayed healthy, so this is distribution into a liquid tape rather than a buyers' strike. The rupiah is the variable worth watching: while it holds, the selling reads as rotation; if it slips, it reads as outflow.",
    takeaways: [
      "Composite lower; foreign investors net sellers in the regular market",
      "Turnover healthy — distribution into liquidity, not a buyers' strike",
      "Rupiah stability is what separates rotation from outflow",
      "Banks and large caps carry most of the foreign flow",
      "Coal names are the clearest beneficiary of firm commodity prices",
    ],
  },
  commodities: {
    headline: "Energy stays bid while metals wait on Chinese demand",
    badge: "Commodities View",
    publishedAt: "11 Sep 2026",
    body:
      "Crude held above recent ranges on supply concerns while precious metals consolidated after a strong run. Base metals were mixed, with demand signals out of China still uneven. For Indonesian equities the relevant transmission is coal and crude: firm energy prices support the earnings of the exporters that dominate the energy sector index, while palm oil matters to the agribusiness names.",
    takeaways: [
      "Crude holding above its recent range on supply concerns",
      "Precious metals consolidating after a strong run",
      "Base metals mixed as Chinese demand signals stay uneven",
      "Firm energy prices support Indonesian coal and oil exporters",
    ],
  },
};
