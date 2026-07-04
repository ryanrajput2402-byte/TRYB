import { format } from "date-fns";

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

// Compact date range, e.g. "Sep 17–27" (same month) or "Sep 28–Oct 3".
export function formatCompactRange(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth ? `${format(start, "MMM d")}–${format(end, "d")}` : `${format(start, "MMM d")}–${format(end, "MMM d")}`;
}

// Relative time, e.g. "just now" / "2h ago" / "3d ago". Only meaningful for
// genuinely recent timestamps — callers should decide their own cutoff for
// when "ago" phrasing stops being useful and fall back to an absolute date.
export function formatRelativeTime(iso: string): string {
  const hoursAgo = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hoursAgo < 0) return "just now";
  if (hoursAgo < 1) return "just now";
  if (hoursAgo < 24) return `${Math.round(hoursAgo)}h ago`;
  return `${Math.round(hoursAgo / 24)}d ago`;
}
