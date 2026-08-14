/**
 * Turns free-text provider input (e.g. the register form's "Primary
 * service category" field, placeholder "e.g. Electrical") into a
 * `Category.slug`-shaped string. Provider-supplied categories at signup
 * aren't required to already exist in the `categories` table — Part 3
 * (Services) is what lets providers attach themselves to the real catalog —
 * so this just normalizes the value consistently until then.
 */
export function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "general";
}
