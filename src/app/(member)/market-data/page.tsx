import { redirect } from "next/navigation";

/** /market-data is the nav target; the sections own the real URLs. */
export default function MarketDataPage() {
  redirect("/market-data/global");
}
