import Image from "next/image";
import { parseContent, isSafeHref, type Block, type Inline } from "@/features/discussion/discussion-content";
import { TickerBadge } from "./badges";

/**
 * Renders a parsed discussion body.
 *
 * Everything goes through React elements — no dangerouslySetInnerHTML anywhere
 * on this path — so a body can never inject markup, whoever wrote it.
 */
export function DiscussionContentBody({ body }: { body: string }) {
  const blocks = parseContent(body);

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading":
      return block.level === 3 ? (
        <h3 className="pt-2 text-lg font-semibold text-ink">
          <InlineRun content={block.content} />
        </h3>
      ) : (
        <h4 className="pt-1 text-base font-semibold text-ink">
          <InlineRun content={block.content} />
        </h4>
      );

    case "paragraph":
      return (
        <p className="text-sm leading-relaxed text-ink-muted">
          <InlineRun content={block.content} />
        </p>
      );

    case "bullets":
      return (
        <ul className="space-y-2">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>
                <InlineRun content={item} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "numbers":
      return (
        <ol className="space-y-2">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
              <span className="shrink-0 font-semibold text-ink-faint">{index + 1}.</span>
              <span>
                <InlineRun content={item} />
              </span>
            </li>
          ))}
        </ol>
      );

    case "quote":
      return (
        <blockquote className="border-l-2 border-accent pl-4 text-sm italic leading-relaxed text-ink-muted">
          <InlineRun content={block.content} />
        </blockquote>
      );

    case "image":
      return isSafeHref(block.src) ? (
        <figure className="overflow-hidden rounded-xl border border-edge">
          {/* Charts arrive at unknown sizes; width/height are a ratio hint and
              the classes do the actual sizing. */}
          <Image
            src={block.src}
            alt={block.alt}
            width={1200}
            height={675}
            unoptimized
            className="h-auto w-full"
          />
          {block.alt ? (
            <figcaption className="border-t border-edge bg-panel-raised/40 px-3 py-2 text-xs text-ink-faint">
              {block.alt}
            </figcaption>
          ) : null}
        </figure>
      ) : null;
  }
}

function InlineRun({ content }: { content: Inline[] }) {
  return (
    <>
      {content.map((part, index) => {
        switch (part.kind) {
          case "bold":
            return (
              <strong key={index} className="font-semibold text-ink">
                {part.value}
              </strong>
            );
          case "italic":
            return <em key={index}>{part.value}</em>;
          case "ticker":
            return (
              <span key={index} className="mx-0.5 inline-block align-baseline">
                <TickerBadge ticker={part.value} />
              </span>
            );
          case "link":
            return isSafeHref(part.href) ? (
              <a
                key={index}
                href={part.href}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                {part.value}
              </a>
            ) : (
              <span key={index}>{part.value}</span>
            );
          default:
            return <span key={index}>{part.value}</span>;
        }
      })}
    </>
  );
}
