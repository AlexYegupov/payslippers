/**
 * Centralized date, time, and currency formatting utilities.
 */

/**
 * Format a date string as a short date using the browser's locale
 * (e.g. "6/22/26" for en-US, "22.06.26" for de-DE, "22/06/2026" for fr-FR).
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

/**
 * Format a date string as a relative time (e.g. "just now", "5 min ago", "3h ago", "2d ago")
 * or fall back to a short date if older than a week.
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

/**
 * Format cents as a dollar string (e.g. 1250 → "$12.50").
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Convert a Date object to an ISO-8601 date string (YYYY-MM-DD).
 * Replaces the common `date.toISOString().split("T")[0]` pattern.
 */
export function dateToISOString(date: Date): string {
  return date.toISOString().split("T")[0];
}
