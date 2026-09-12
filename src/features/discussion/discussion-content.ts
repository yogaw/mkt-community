/**
 * A deliberately small markdown subset for discussion bodies.
 *
 * The brief asks for headings, paragraphs, bullet and numbered lists, links and
 * images, and asks not to pull in a heavy editor. A full markdown parser is
 * hundreds of kilobytes and brings inline HTML with it, which would mean
 * sanitising admin prose before rendering. Parsing a fixed set of line shapes
 * into typed blocks is ~80 lines, renders through React (so nothing is ever
 * injected as HTML), and covers everything the brief lists.
 *
 * Supported, one construct per line:
 *   ## Heading            → h3
 *   ### Heading           → h4
 *   - item  /  * item     → bullet list
 *   1. item               → numbered list
 *   > quote               → blockquote
 *   ![alt](url)           → image
 *   blank line            → new block
 * Inline: **bold**, *italic*, [text](url), $TICKER
 */
export type Inline =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "link"; value: string; href: string }
  | { kind: "ticker"; value: string };

export type Block =
  | { kind: "heading"; level: 3 | 4; content: Inline[] }
  | { kind: "paragraph"; content: Inline[] }
  | { kind: "bullets"; items: Inline[][] }
  | { kind: "numbers"; items: Inline[][] }
  | { kind: "quote"; content: Inline[] }
  | { kind: "image"; src: string; alt: string };

const IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
const BULLET = /^[-*•]\s+(.*)$/;
const NUMBER = /^\d+[.)]\s+(.*)$/;
const HEADING = /^(#{2,3})\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;

export function parseContent(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");

  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", content: parseInline(paragraph.join(" ")) });
      paragraph = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (line === "") {
      flushParagraph();
      continue;
    }

    const image = IMAGE.exec(line);
    if (image) {
      flushParagraph();
      blocks.push({ kind: "image", src: image[2], alt: image[1] });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        // The page already owns h1 and h2, so the body starts at h3 and the
        // document outline stays in order.
        kind: "heading",
        level: heading[1].length === 2 ? 3 : 4,
        content: parseInline(heading[2]),
      });
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      flushParagraph();
      blocks.push({ kind: "quote", content: parseInline(quote[1]) });
      continue;
    }

    if (BULLET.test(line) || NUMBER.test(line)) {
      flushParagraph();
      const bulleted = BULLET.test(line);
      const pattern = bulleted ? BULLET : NUMBER;
      const items: Inline[][] = [];

      // Consume the whole run, so one list does not become five one-item lists.
      while (index < lines.length) {
        const match = pattern.exec(lines[index].trim());
        if (!match) {
          break;
        }
        items.push(parseInline(match[1]));
        index += 1;
      }
      index -= 1;

      blocks.push(bulleted ? { kind: "bullets", items } : { kind: "numbers", items });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))|(\$[A-Z]{2,6}\b)/g;

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE)) {
    const start = match.index;
    if (start > cursor) {
      parts.push({ kind: "text", value: text.slice(cursor, start) });
    }

    const token = match[0];
    if (token.startsWith("**")) {
      parts.push({ kind: "bold", value: token.slice(2, -2) });
    } else if (token.startsWith("[")) {
      const split = token.indexOf("](");
      parts.push({
        kind: "link",
        value: token.slice(1, split),
        href: token.slice(split + 2, -1),
      });
    } else if (token.startsWith("$")) {
      parts.push({ kind: "ticker", value: token.slice(1) });
    } else {
      parts.push({ kind: "italic", value: token.slice(1, -1) });
    }

    cursor = start + token.length;
  }

  if (cursor < text.length) {
    parts.push({ kind: "text", value: text.slice(cursor) });
  }
  return parts;
}

/**
 * Only these schemes render as links. A body is admin-written, but "trusted
 * author" is not a reason to let `javascript:` through — one compromised admin
 * session should not become script execution in every reader's browser.
 */
const SAFE_SCHEME = /^(https?:\/\/|\/|mailto:)/i;

export function isSafeHref(href: string): boolean {
  return SAFE_SCHEME.test(href.trim());
}
