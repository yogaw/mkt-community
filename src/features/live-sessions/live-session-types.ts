export type LiveSessionPlatform = "ZOOM" | "GOOGLE_MEET" | "OTHER";

export interface UpcomingSessionDto {
  id: string;
  title: string;
  scheduledAt: string;
  platform: LiveSessionPlatform;
  platformLabel: string;
  joinUrl: string;
}

const platformLabels: Record<LiveSessionPlatform, string> = {
  ZOOM: "Zoom",
  GOOGLE_MEET: "Google Meet",
  OTHER: "Other",
};

export function toPlatformLabel(platform: LiveSessionPlatform): string {
  return platformLabels[platform];
}
