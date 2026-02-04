/**
 * Convert a string to a URL-friendly slug
 * Example: "My First Book" => "my-first-book"
 */
export function slugify(text) {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

/**
 * Encode a name for use in URL
 */
export function encodeForUrl(name) {
  return encodeURIComponent(name);
}

/**
 * Decode a name from URL
 */
export function decodeFromUrl(encodedName) {
  return decodeURIComponent(encodedName);
}

