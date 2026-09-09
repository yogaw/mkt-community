import type {
  FeaturedContent,
  FeaturedAnnouncementItem,
  FeaturedNewsItem,
  FeaturedVideoItem,
  HomeFeed,
  HomeFeedUpdate,
} from "@/features/home/home-types";
import type {
  FeaturedContentRow,
  DashboardRepository,
  UpdateRow,
} from "@/features/home/repository/dashboard-repository";
import { dashboardRepository } from "@/features/home/repository/dashboard-repository";
import type { LiveSessionService } from "@/features/live-sessions/service/live-session-service";
import { liveSessionService } from "@/features/live-sessions/service/live-session-service";
import { toVideoCardDto } from "@/features/videos/video-mappers";
import { truncate } from "@/lib/text/truncate";

const LATEST_VIDEOS_LIMIT = 6;
const LATEST_UPDATES_LIMIT = 5;
const SNIPPET_MAX_LENGTH = 160;

export interface DashboardService {
  getHomeFeed(): Promise<HomeFeed>;
}

export class DashboardServiceImpl implements DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly liveSessions: LiveSessionService,
  ) {}

  async getHomeFeed(): Promise<HomeFeed> {
    const [featuredContent, upcomingSession, latestVideoRows, latestUpdateRows] = await Promise.all([
      this.repository.findFeaturedContent(),
      this.liveSessions.getNextUpcomingSession(),
      this.repository.findLatestVideos(LATEST_VIDEOS_LIMIT),
      this.repository.findLatestUpdates(LATEST_UPDATES_LIMIT),
    ]);

    return {
      featuredContent: featuredContent ? toFeaturedContent(featuredContent) : null,
      upcomingSession,
      latestVideos: latestVideoRows.map(toVideoCardDto),
      latestUpdates: latestUpdateRows.map(toHomeFeedUpdate),
    };
  }
}

function toFeaturedContent(row: FeaturedContentRow): FeaturedContent {
  switch (row.kind) {
    case "video": {
      const item: FeaturedVideoItem = toVideoCardDto(row.item);
      return { kind: "video", ctaLabel: "Watch Now", item };
    }
    case "announcement": {
      const { id, title, content, publishedAt } = row.item;
      const item: FeaturedAnnouncementItem = {
        id,
        title,
        snippet: toSnippet(content),
        publishedAt: publishedAt.toISOString(),
      };
      return { kind: "announcement", ctaLabel: "View Details", item };
    }
    case "news": {
      const { id, title, summary, publishedAt } = row.item;
      const item: FeaturedNewsItem = {
        id,
        title,
        summary,
        publishedAt: publishedAt.toISOString(),
      };
      return { kind: "news", ctaLabel: "Read More", item };
    }
  }
}

function toHomeFeedUpdate(row: UpdateRow): HomeFeedUpdate {
  return {
    kind: row.kind,
    id: row.item.id,
    title: row.item.title,
    badgeLabel: toBadgeLabel(row),
    publishedAt: row.item.publishedAt.toISOString(),
  };
}

function toBadgeLabel(row: UpdateRow): string {
  return row.kind === "announcement" ? "Announcement" : row.item.category.name;
}

function toSnippet(content: string): string {
  return truncate(content, SNIPPET_MAX_LENGTH);
}

export const dashboardService: DashboardService = new DashboardServiceImpl(dashboardRepository, liveSessionService);
