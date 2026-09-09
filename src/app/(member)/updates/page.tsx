import type { Metadata } from "next";
import { UpdatesFeed } from "@/features/updates/components/updates-feed";

export const metadata: Metadata = {
  title: "Updates — Piranha",
  description: "All market news and community announcements in one feed.",
};

export default function UpdatesPage() {
  return <UpdatesFeed />;
}
