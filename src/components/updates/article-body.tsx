interface ArticleBodyProps {
  content: string;
}

/**
 * Renders plain-text article content as paragraphs.
 * Blank lines separate paragraphs; single newlines become line breaks.
 */
export function ArticleBody({ content }: ArticleBodyProps) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
