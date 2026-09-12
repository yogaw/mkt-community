import type { Metadata } from "next";
import { AdminDiscussionEditor } from "@/features/discussion/components/admin-discussion-editor";

export const metadata: Metadata = {
  title: "Edit Discussion — Piranha",
};

export default async function EditDiscussionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminDiscussionEditor discussionId={id} />;
}
