import { VideoProviderKind, type VideoProviderKind as VideoProviderKindType } from "@/database/prisma/enums";

interface VideoPlayerProps {
  provider: VideoProviderKindType;
  embedUrl: string;
  thumbnailUrl: string;
  title: string;
}

export function VideoPlayer({ provider, embedUrl, thumbnailUrl, title }: VideoPlayerProps) {
  if (provider === VideoProviderKind.YOUTUBE || provider === VideoProviderKind.VIMEO) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video controls preload="metadata" poster={thumbnailUrl} className="h-full w-full">
        <source src={embedUrl} />
        Your browser does not support the video element.
      </video>
    </div>
  );
}
