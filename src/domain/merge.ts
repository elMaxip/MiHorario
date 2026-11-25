import { DAYS, type Block } from "./types";

/** Bloques separados por menos de esto se muestran y se comparan como uno. */
export const MERGE_GAP = 15;

const dayIndex = (b: Block) => DAYS.indexOf(b.day);

/**
 * Fusiona los bloques de una sección que se solapan o que están a menos de
 * 15 minutos en el mismo día. Devuelve una lista nueva ordenada por día y hora.
 */
export function mergeBlocks(blocks: readonly Block[]): Block[] {
  const sorted = [...blocks].sort(
    (a, b) => dayIndex(a) - dayIndex(b) || a.start - b.start,
  );
  const out: Block[] = [];
  for (const b of sorted) {
    const last = out[out.length - 1];
    if (last && last.day === b.day && b.start - last.end < MERGE_GAP) {
      last.end = Math.max(last.end, b.end);
    } else {
      out.push({ day: b.day, start: b.start, end: b.end });
    }
  }
  return out;
}
