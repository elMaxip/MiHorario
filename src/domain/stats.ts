import { MERGE_GAP } from "./merge";
import { DAYS, type Block, type Day, type ScheduleStats } from "./types";

/** Días con clases, minutos de ventanas (huecos de 15 min o más) y hora de salida. */
export function computeStats(blocks: Iterable<Block>): ScheduleStats {
  const byDay = new Map<Day, Block[]>();
  let end = 0;
  for (const b of blocks) {
    let list = byDay.get(b.day);
    if (!list) byDay.set(b.day, (list = []));
    list.push(b);
    if (b.end > end) end = b.end;
  }
  let gap = 0;
  for (const day of DAYS) {
    const list = byDay.get(day);
    if (!list) continue;
    list.sort((a, b) => a.start - b.start);
    for (let i = 1; i < list.length; i++) {
      const g = list[i].start - list[i - 1].end;
      if (g >= MERGE_GAP) gap += g;
    }
  }
  return { days: byDay.size, gap, end };
}
