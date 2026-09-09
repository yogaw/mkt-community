import type { Metadata } from "next";
import { VideoLibrary } from "@/features/videos/components/video-library";

export const metadata: Metadata = {
  title: "Videos — Piranha",
  description: "Browse all published market videos, filter by category and search by title.",
};

export default function VideosPage() {
  return <VideoLibrary />;
}
