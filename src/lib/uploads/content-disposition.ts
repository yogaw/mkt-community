/**
 * Builds a Content-Disposition header that survives a non-ASCII filename.
 *
 * HTTP header values are ByteStrings, so a title containing an em dash — which
 * every one of the seeded research reports does — throws when set directly.
 * RFC 6266 handles this with two parameters: a plain `filename` carrying an
 * ASCII-safe fallback for old clients, and `filename*` carrying the real name
 * percent-encoded as UTF-8 for everything current.
 */

/** Quotes and backslashes end the quoted-string; control characters and path
 *  separators have no business in a filename. */
const UNSAFE = /[\u0000-\u001f"\\/]+/g;

/** Anything outside printable ASCII cannot go in the plain `filename`. */
const NON_ASCII = /[^\u0020-\u007e]+/g;

export function contentDisposition(
  disposition: "inline" | "attachment",
  filename: string,
): string {
  const cleaned = filename.replace(UNSAFE, " ").replace(/\s{2,}/g, " ").trim() || "document";

  const ascii = cleaned
    .replace(NON_ASCII, "-")
    .replace(/-{2,}/g, "-")
    .trim();

  return (
    `${disposition}; filename="${ascii || "document"}"; ` +
    `filename*=UTF-8''${encodeURIComponent(cleaned)}`
  );
}
