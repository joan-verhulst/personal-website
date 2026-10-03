interface Options {
  max?: number;
  // What an input without a single letter or digit becomes
  fallback?: string;
}

/**
 * Lowercase letters and digits joined by dashes, for ids and file names.
 * Accents are dropped: "Café Olé" becomes "cafe-ole". Safe in the browser,
 * which is why it has its own file.
 */
export const slugify = (
  text: string,
  { max = 60, fallback = "item" }: Options = {},
) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max) || fallback;
