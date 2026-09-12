import type { Metadata } from "next";
import { SignalsView } from "@/features/signals/components/signals-view";

export const metadata: Metadata = {
  title: "Signals — Piranha",
  description: "Actionable trade ideas with entry, targets, stop loss and a running timeline.",
};

export default function SignalsPage() {
  return <SignalsView />;
}
