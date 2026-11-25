import { toSentenceCase } from "@/domain/text";
import { formatDuration, formatHM } from "@/domain/time";
import { DAYS, type Availability, type Block, type Day, type Schedule, type Section, type Subject } from "@/domain/types";
import type { GenerationRequest } from "@/state/generation";
import type { SortKey } from "@/state/prefs";

export interface PlacedSection {
  subject: Subject;
  section: Section;
  color: number;
  /** Carrera de origen cuando la sección es de otra carrera (D1). */
  origin: string | null;
}

export interface PlacedBlock extends Block {
  item: PlacedSection;
}

export function placeSchedule(req: GenerationRequest, schedule: Schedule): PlacedSection[] {
  const carrera = req.scope.carrera;
  return schedule.picks.map((sectionIndex, i) => {
    const subject = req.subjects[i];
    const section = subject.sections[sectionIndex];
    const origin = carrera && !section.carreras.includes(carrera) ? toSentenceCase(section.carreras[0] ?? "") : null;
    return { subject, section, color: req.colors[i] ?? i % 6, origin };
  });
}

export function blocksByDay(items: readonly PlacedSection[]): Record<Day, PlacedBlock[]> {
  const out = Object.fromEntries(DAYS.map((d) => [d, [] as PlacedBlock[]])) as Record<Day, PlacedBlock[]>;
  for (const item of items) for (const b of item.section.blocks) out[b.day].push({ ...b, item });
  for (const d of DAYS) out[d].sort((a, b) => a.start - b.start);
  return out;
}

/** Rango horario de la semana: de la hora más temprana a la más tardía disponible. */
export function weekRange(a: Availability): { start: number; end: number } {
  const on = DAYS.filter((d) => a[d].on);
  const start = Math.floor(Math.min(1350, ...on.map((d) => a[d].start)) / 60) * 60;
  const end = Math.ceil(Math.max(540, ...on.map((d) => a[d].end)) / 60) * 60;
  return { start: Math.min(start, end - 60), end };
}

export function sortSchedules(list: readonly Schedule[], key: SortKey): Schedule[] {
  const out = [...list];
  if (key === "orig") return out.sort((a, b) => a.n - b.n);
  return out.sort(
    (a, b) =>
      a.stats[key] - b.stats[key] || a.stats.gap - b.stats.gap || a.stats.end - b.stats.end || a.n - b.n,
  );
}

export const daysLabel = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;
export const gapLabel = (gap: number) => (gap ? `Ventanas: ${formatDuration(gap)}` : "Sin ventanas");

/** «4 días de clases, 7 h 53 min de ventanas. La última clase termina a las 15:20.» */
export function summary(s: Schedule): string {
  const { days, gap, end } = s.stats;
  return `${daysLabel(days)} de clases, ${gap ? `${formatDuration(gap)} de ventanas` : "sin ventanas"}. La última clase termina a las ${formatHM(end)}.`;
}
