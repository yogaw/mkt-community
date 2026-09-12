/**
 * Title to URL key.
 *
 * Uniqueness is the service's job — this only produces the shape. Accents are
 * stripped rather than dropped so "Analisa Pasar" and "Análisa Pasar" do not
 * become two different slugs.
 */
const MAX_LENGTH = 200;

/**
 * Segments the router owns. The detail route resolves a slug as well as an id,
 * and /discussion/new is a page — so a thread titled "New" must not be able to
 * claim that URL and shadow the editor.
 */
const RESERVED = new Set(["new", "edit", "guidelines", "contributors"]);

export function toSlug(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, "");

  // A title of pure punctuation or non-Latin script leaves nothing behind, and
  // an empty slug would collide with every other empty one.
  if (slug === "") {
    return "discussion";
  }
  return RESERVED.has(slug) ? `${slug}-discussion` : slug;
}
