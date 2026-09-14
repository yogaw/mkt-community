import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { formatJakartaDateTime } from "@/features/discussion/discussion-display";
import type { ThreadDetailDto } from "@/features/discussion/discussion-types";
import { AdminBadge } from "./badges";
import { DiscussionContentBody } from "./discussion-content-body";

/** The opening post: who wrote it, when, and the body itself. */
export function DiscussionPost({ thread }: { thread: ThreadDetailDto }) {
  return (
    <article className="rounded-xl border border-edge bg-panel">
      {thread.thumbnailUrl ? (
        <Image
          src={thread.thumbnailUrl}
          alt=""
          width={1200}
          height={520}
          unoptimized
          className="h-auto w-full rounded-t-xl object-cover"
        />
      ) : null}

      <div className="p-5 sm:p-6">
        <header className="flex items-center gap-3">
          <Avatar name={thread.author.name} className="h-10 w-10 text-sm" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{thread.author.name}</span>
              {thread.author.isAdmin ? <AdminBadge title={thread.author.title} /> : null}
            </p>
            <p className="text-xs text-ink-faint">
              {formatJakartaDateTime(thread.publishedAt ?? thread.createdAt)}
            </p>
          </div>
        </header>

        <div className="mt-5">
          <DiscussionContentBody body={thread.body} />
        </div>
      </div>
    </article>
  );
}
