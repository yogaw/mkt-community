import type { UpcomingSessionDto } from "@/features/live-sessions/live-session-types";
import type { VideoCardDto } from "@/features/videos/video-types";

export interface FeaturedVideoItem {
  id: string;
  title: string;
  shortDescription: string;
  thumbnailUrl: string;
  durationSeconds: number;
  publishedAt: string;
}

export interface FeaturedAnnouncementItem {
  id: string;
  title: string;
  snippet: string;
  publishedAt: string;
}

export interface FeaturedNewsItem {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
}

export type FeaturedContent =
  | { kind: "video"; ctaLabel: "Watch Now"; item: FeaturedVideoItem }
  | { kind: "news"; ctaLabel: "Read More"; item: FeaturedNewsItem }
  | { kind: "announcement"; ctaLabel: "View Details"; item: FeaturedAnnouncementItem };

export type UpcomingSession = UpcomingSessionDto;

export type HomeFeedVideo = VideoCardDto;

export interface HomeFeedUpdate {
  kind: "news" | "announcement";
  id: string;
  title: string;
  badgeLabel: string;
  publishedAt: string;
}

export interface HomeFeed {
  featuredContent: FeaturedContent | null;
  upcomingSession: UpcomingSession | null;
  latestVideos: HomeFeedVideo[];
  latestUpdates: HomeFeedUpdate[];
}
