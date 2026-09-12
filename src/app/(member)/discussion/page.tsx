import type { Metadata } from "next";
import { DiscussionBoard } from "@/features/discussion/components/discussion-board";

export const metadata: Metadata = {
  title: "Discussion — Piranha",
  description: "Member discussion threads on IDX stocks and the market.",
};

export default function DiscussionPage() {
  return <DiscussionBoard />;
}
