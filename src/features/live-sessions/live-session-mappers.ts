import type { LiveSessionModel } from "@/database/prisma/models";
import { toPlatformLabel, type LiveSessionPlatform, type UpcomingSessionDto } from "./live-session-types";

export function toUpcomingSessionDto(session: LiveSessionModel): UpcomingSessionDto {
  return {
    id: session.id,
    title: session.title,
    scheduledAt: session.scheduledAt.toISOString(),
    platform: session.platform as LiveSessionPlatform,
    platformLabel: toPlatformLabel(session.platform as LiveSessionPlatform),
    joinUrl: session.joinUrl,
  };
}
