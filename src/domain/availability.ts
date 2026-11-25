import { DAYS, type Availability, type Day, type Minutes } from "./types";

/** Límites de la grilla de disponibilidad: 08:00 a 22:30, en pasos de 30 min. */
export const GRID_START = 480;
export const GRID_END = 1350;
export const GRID_STEP = 30;

/**
 * Disponibilidad por defecto: lunes, miércoles y viernes de 08:00 a 14:00;
 * martes y jueves de 08:00 a 17:00; sábado libre.
 */
export function defaultAvailability(): Availability {
  return Object.fromEntries(
    DAYS.map((d) => [
      d,
      { on: d !== "Sa", start: 480, end: d === "Ma" || d === "Ju" ? 1020 : 840 },
    ]),
  ) as Availability;
}

export function uniform(start: Minutes, end: Minutes): Availability {
  return Object.fromEntries(DAYS.map((d) => [d, { on: true, start, end }])) as Availability;
}

export interface Preset {
  label: string;
  start: Minutes;
  end: Minutes;
}

export const PRESETS: readonly Preset[] = [
  { label: "Mañana", start: 480, end: 840 },
  { label: "Tarde", start: 840, end: 1140 },
  { label: "Vespertino", start: 1140, end: 1350 },
  { label: "Todo el día", start: 480, end: 1350 },
];

export function presetActive(a: Availability, p: Preset): boolean {
  return DAYS.every((d) => a[d].on && a[d].start === p.start && a[d].end === p.end);
}

/** Tramos del día: mañana hasta las 14:00, tarde hasta las 19:00, noche después. */
export const DAY_PARTS: readonly [Minutes, Minutes][] = [
  [0, 840],
  [840, 1140],
  [1140, 1440],
];

export interface Band {
  start: Minutes;
  end: Minutes;
  /** 0 mañana, 1 tarde, 2 noche. */
  part: 0 | 1 | 2;
}

/** Parte un rango en los tramos del día que toca. */
export function bands(start: Minutes, end: Minutes): Band[] {
  const out: Band[] = [];
  DAY_PARTS.forEach(([a, z], k) => {
    const p = Math.max(start, a);
    const q = Math.min(end, z);
    if (q > p) out.push({ start: p, end: q, part: k as Band["part"] });
  });
  return out;
}

/**
 * Degradado con cortes nítidos para pintar un rango con los tonos de cada tramo.
 * `tones` son valores CSS, normalmente variables de `tokens.css`.
 */
export function bandGradient(start: Minutes, end: Minutes, tones: readonly [string, string, string]): string {
  const pct = (m: Minutes) => `${(((m - start) / (end - start)) * 100).toFixed(3)}%`;
  const stops = bands(start, end).map((b) => `${tones[b.part]} ${pct(b.start)} ${pct(b.end)}`);
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
}

/** Valida y normaliza un rango leído de fuera (por ejemplo, de localStorage). */
export function isDayRange(v: unknown): v is Availability[Day] {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.on === "boolean" &&
    Number.isInteger(r.start) &&
    Number.isInteger(r.end) &&
    (r.start as number) >= 0 &&
    (r.end as number) <= 1440 &&
    (r.start as number) < (r.end as number)
  );
}

export function isAvailability(v: unknown): v is Availability {
  if (!v || typeof v !== "object") return false;
  return DAYS.every((d) => isDayRange((v as Record<string, unknown>)[d]));
}
