import type { Availability, Block, Day, DayRange, Subject } from "./types";

/** Lo que habría que cambiar para que una sección quepa. */
export interface NearestFit {
  sectionIndex: number;
  code: string;
  /** Rangos nuevos para los días que hay que ampliar o activar. */
  need: Partial<Record<Day, DayRange>>;
  cost: number;
}

export interface CandidateSection {
  index: number;
  code: string;
  blocks: readonly Block[];
}

/** Costo extra de activar un día apagado, para preferir ampliar los ya activos. */
const OFF_DAY_COST = 600;
const STEP = 30;

/**
 * La sección más cercana a caber: la que pide ampliar menos minutos la
 * disponibilidad (activar un día cuesta más). Los rangos se ajustan a 30 min.
 */
export function nearestAmong(
  sections: readonly CandidateSection[],
  availability: Availability,
): NearestFit | null {
  let best: NearestFit | null = null;
  for (const section of sections) {
    const need: Partial<Record<Day, DayRange>> = {};
    let cost = 0;
    for (const b of section.blocks) {
      const h = need[b.day] ?? availability[b.day];
      const start = Math.floor(b.start / STEP) * STEP;
      const end = Math.ceil(b.end / STEP) * STEP;
      if (!h.on) {
        need[b.day] = { on: true, start, end };
        cost += OFF_DAY_COST;
        continue;
      }
      if (b.start < h.start || b.end > h.end) {
        const n = { on: true, start: Math.min(h.start, start), end: Math.max(h.end, end) };
        cost += h.start - n.start + (n.end - h.end);
        need[b.day] = n;
      }
    }
    if (!best || cost < best.cost) {
      best = { sectionIndex: section.index, code: section.code, need, cost };
    }
  }
  return best;
}

/** `nearestAmong` para las secciones `sectionIndexes` de una asignatura. */
export function nearestSection(
  subject: Subject,
  sectionIndexes: readonly number[],
  availability: Availability,
): NearestFit | null {
  return nearestAmong(
    sectionIndexes.map((index) => ({
      index,
      code: subject.sections[index].code,
      blocks: subject.sections[index].blocks,
    })),
    availability,
  );
}

/** Aplica la sugerencia sobre la disponibilidad. */
export function applyNeed(availability: Availability, fit: NearestFit): Availability {
  return { ...availability, ...fit.need };
}
