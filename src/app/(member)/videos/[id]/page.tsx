import type { Metadata } from "next";
import { VideoDetailView } from "@/features/videos/components/video-detail-view";

export const metadata: Metadata = {
  title: "Video — Piranha",
};

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VideoDetailView videoId={id} />;
}
