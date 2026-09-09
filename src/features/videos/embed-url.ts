import { VideoProviderKind } from "@/database/prisma/enums";
import type { VideoProviderKind as VideoProviderKindType } from "@/database/prisma/enums";

/**
 * Builds the URL the player renders for a video: an embed URL for the
 * iframe-based providers (YouTube, Vimeo) or the raw URL for direct playback.
 */
export function toEmbedUrl(provider: VideoProviderKindType, videoUrl: string): string {
  switch (provider) {
    case VideoProviderKind.YOUTUBE:
      return toYouTubeEmbedUrl(videoUrl);
    case VideoProviderKind.VIMEO:
      return toVimeoEmbedUrl(videoUrl);
    default:
      return videoUrl;
  }
}

function toYouTubeEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    const videoId = parsed.searchParams.get("v");
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    const markerIndex = segments.findIndex((segment) => segment === "embed" || segment === "shorts");
    if (markerIndex >= 0 && segments[markerIndex + 1]) {
      return `https://www.youtube.com/embed/${segments[markerIndex + 1]}`;
    }

    return url;
  } catch {
    return url;
  }
}

function toVimeoEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const videoId = parsed.pathname.split("/").filter(Boolean)[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  } catch {
    return url;
  }
}
