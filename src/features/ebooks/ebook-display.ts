import type { EbookTag } from "@/features/ebooks/ebook-types";

export const ebookTagLabel: Record<EbookTag, string> = {
  RESEARCH_REPORT: "Research Report",
  ARTICLE: "Article",
};

export const ebookTagTone: Record<EbookTag, string> = {
  RESEARCH_REPORT: "bg-alt/10 text-alt",
  ARTICLE: "bg-info/10 text-info",
};

/** 442_385 -> "432 KB". Document sizes, not market figures. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
