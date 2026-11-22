/**
 * Returns `value` only if it is a same-site path such as "/analyze".
 *
 * Rejects anything a browser could resolve to another origin:
 * "//evil.com", "/\evil.com" (browsers treat "\" like "/"), absolute URLs,
 * and paths containing control characters.
 */
export function sanitizeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

/** Reads and sanitizes the `?next=` query parameter of the current page. */
export function safeNextPath(): string | null {
  if (typeof window === "undefined") return null;
  return sanitizeNextPath(new URLSearchParams(window.location.search).get("next"));
}
