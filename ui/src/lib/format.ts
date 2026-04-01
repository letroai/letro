/**
 * Formatting utilities for the Korean UI.
 * All output uses natural Korean with no technical jargon.
 */

/**
 * Format cost in cents to a human-readable Korean string.
 * @example formatCost(4200)  // "약 42달러"
 * @example formatCost(0)     // "0달러"
 * @example formatCost(50)    // "약 1달러"
 */
export function formatCost(cents: number): string {
  if (cents === 0) return "0달러";
  const dollars = Math.round(cents / 100);
  if (dollars === 0) return "약 1달러";
  return `약 ${formatNumber(dollars)}달러`;
}

/**
 * Format an ISO timestamp to a relative time string in Korean.
 * @example formatTimeAgo(now)       // "방금"
 * @example formatTimeAgo(5min ago)  // "5분 전"
 */
export function formatTimeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "방금";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;

  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a number with thousands separators.
 * @example formatNumber(1234) → "1,234"
 */
export function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}
