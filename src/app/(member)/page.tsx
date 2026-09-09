import type { Metadata } from "next";
import { HomeDashboard } from "@/features/home/components/home-dashboard";

export const metadata: Metadata = {
  title: "Home — Piranha",
  description:
    "Your Indonesian market intelligence dashboard: market snapshot, today's briefing, stocks in focus and member content.",
};

export default function HomePage() {
  return <HomeDashboard />;
}
