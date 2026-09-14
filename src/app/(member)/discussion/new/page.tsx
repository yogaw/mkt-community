import type { Metadata } from "next";
import { AdminDiscussionEditor } from "@/features/discussion/components/admin-discussion-editor";

export const metadata: Metadata = {
  title: "New Discussion — Piranha",
};

/** Admin-only in the UI; POST /api/v1/discussions is what actually enforces it. */
export default function NewDiscussionPage() {
  return <AdminDiscussionEditor />;
}
