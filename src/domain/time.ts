import type { Minutes } from "./types";

/** «9:31:00» o «09:31» → 571. Devuelve NaN si no es una hora. */
export function toMinutes(time: string): Minutes {
  const m = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*$/.exec(time);
  if (!m) return Number.NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 571 → «09:31». */
export function formatHM(minutes: Minutes): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 152 → «2 h 32 min», 60 → «1 h», 0 → «0 min». */
export function formatDuration(minutes: Minutes): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  return parts.join(" ") || "0 min";
}

/** «08:01–09:20». */
export function formatRange(start: Minutes, end: Minutes): string {
  return `${formatHM(start)}–${formatHM(end)}`;
}
