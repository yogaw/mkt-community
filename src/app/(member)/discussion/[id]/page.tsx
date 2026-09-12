import type { Metadata } from "next";
import { DiscussionDetailPage } from "@/features/discussion/components/discussion-detail-page";

export const metadata: Metadata = {
  title: "Discussion — Piranha",
};

export default async function DiscussionThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DiscussionDetailPage discussionId={id} />;
}
