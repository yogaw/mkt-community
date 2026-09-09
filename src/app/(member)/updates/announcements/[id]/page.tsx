import type { Metadata } from "next";
import { AnnouncementDetailView } from "@/features/updates/components/announcement-detail-view";

export const metadata: Metadata = {
  title: "Announcement — Piranha",
};

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnnouncementDetailView announcementId={id} />;
}
