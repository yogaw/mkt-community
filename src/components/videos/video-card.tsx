import Image from "next/image";
import Link from "next/link";
import type { HomeFeedVideo } from "@/features/home/home-types";
import { formatDuration, formatDate } from "@/lib/datetime/format";

interface VideoCardProps {
  video: HomeFeedVideo;
  /** Content-type label shown on the thumbnail, e.g. "VIDEO". */
  typeLabel?: string;
}

export function VideoCard({ video, typeLabel }: VideoCardProps) {
  return (
    <Link
      href={`/videos/${video.id}`}
      className="group block overflow-hidden rounded-xl border border-edge bg-panel transition-colors hover:border-ink-faint"
    >
      <div className="relative aspect-video overflow-hidden bg-panel-raised">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        {typeLabel ? (
          <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            {typeLabel}
          </span>
        ) : null}
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-ink">
          {formatDuration(video.durationSeconds)}
        </span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 font-medium text-ink group-hover:text-accent">{video.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{video.shortDescription}</p>
        <p className="mt-2 text-xs text-ink-faint">{formatDate(video.publishedAt)}</p>
      </div>
    </Link>
  );
}
