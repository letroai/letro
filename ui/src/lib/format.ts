/**
 * Formatting utilities with locale support.
 */

type Locale = "ko" | "en";

/**
 * Format cost in cents to a human-readable string.
 * @example formatCost(4200, "ko")  // "약 42달러"
 * @example formatCost(4200, "en")  // "~$42"
 */
export function formatCost(cents: number, locale: Locale = "en"): string {
  if (cents === 0) return locale === "ko" ? "0달러" : "$0";
  const dollars = Math.round(cents / 100);
  if (dollars === 0) return locale === "ko" ? "약 1달러" : "~$1";
  const n = formatNumber(dollars, locale);
  return locale === "ko" ? `약 ${n}달러` : `~$${n}`;
}

/**
 * Format an ISO timestamp to a relative time string.
 * @example formatTimeAgo(now, "en")  // "just now"
 * @example formatTimeAgo(5min, "ko") // "5분 전"
 */
export function formatTimeAgo(iso: string, locale: Locale = "en"): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return locale === "ko" ? "방금" : "just now";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (locale === "ko") {
    if (seconds < 60) return "방금";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(n: number, locale: Locale = "en"): string {
  return n.toLocaleString(locale === "ko" ? "ko-KR" : "en-US");
}

/**
 * Format a count with unit.
 * @example formatCount(3, "개", "ko") // "3개"
 * @example formatCount(3, "", "en")   // "3"
 */
export function formatCount(n: number, locale: Locale = "en"): string {
  return locale === "ko" ? `${n}개` : `${n}`;
}
