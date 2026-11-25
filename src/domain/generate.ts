import { sectionFits } from "./fit";
import { nearestAmong, type CandidateSection, type NearestFit } from "./nearest";
import { computeStats } from "./stats";
import type { Availability, Block, Schedule } from "./types";

/** Una asignatura pedida, con las secciones de su alcance (carrera, D1). */
export interface ProblemSubject {
  subjectId: string;
  sections: CandidateSection[];
}

export interface Problem {
  subjects: ProblemSubject[];
  availability: Availability;
}

export type GenerateError =
  | { ok: false; reason: "no-subjects" }
  | {
      ok: false;
      reason: "subject-does-not-fit";
      subjectIds: string[];
      /** Sugerencia por asignatura, en el mismo orden que `subjectIds`. */
      nearest: (NearestFit | null)[];
    };

export type PrepareResult = { ok: true; search: ScheduleSearch } | GenerateError;

export interface RunResult {
  schedules: Schedule[];
  /** No quedan más combinaciones. */
  exhausted: boolean;
}

const overlaps = (a: readonly Block[], b: readonly Block[]) =>
  a.some((x) => b.some((y) => x.day === y.day && x.start < y.end && x.end > y.start));

/**
 * Prepara la búsqueda: filtra lo que cabe, ordena las asignaturas de menos a
 * más secciones válidas y precalcula una matriz de choques.
 */
export function prepareSearch(problem: Problem): PrepareResult {
  if (problem.subjects.length === 0) return { ok: false, reason: "no-subjects" };

  const valid = problem.subjects.map((s) =>
    s.sections.filter((sec) => sectionFits(sec, problem.availability)),
  );
  const bad = problem.subjects
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => valid[i].length === 0);
  if (bad.length) {
    return {
      ok: false,
      reason: "subject-does-not-fit",
      subjectIds: bad.map(({ s }) => s.subjectId),
      nearest: bad.map(({ s }) => nearestAmong(s.sections, problem.availability)),
    };
  }
  return { ok: true, search: new ScheduleSearch(valid) };
}

/**
 * Backtracking con pila explícita: se puede pausar después de cualquier
 * cantidad de horarios o de pasos y reanudar exactamente donde quedó.
 */
export class ScheduleSearch {
  /** `order[k]` = asignatura (en el orden pedido) que se decide en el nivel k. */
  private readonly order: number[];
  /** Candidatos por nivel, como ids globales. */
  private readonly levels: Int32Array[];
  private readonly candSection: Int32Array;
  private readonly candBlocks: (readonly Block[])[];
  private readonly clash: Uint8Array;
  private readonly n: number;
  /** Producto acumulado n_0 · … · n_k, para el progreso. */
  private readonly prod: number[];

  private readonly idx: Int32Array;
  private readonly chosen: Int32Array;
  private depth = 0;
  private done = false;
  private found = 0;
  private steps = 0;

  constructor(valid: readonly (readonly CandidateSection[])[]) {
    const L = valid.length;
    this.order = valid
      .map((v, i) => ({ i, n: v.length }))
      .sort((a, b) => a.n - b.n || a.i - b.i)
      .map((x) => x.i);

    const sectionIdx: number[] = [];
    this.candBlocks = [];
    this.levels = this.order.map((s) => {
      const ids = new Int32Array(valid[s].length);
      valid[s].forEach((sec, j) => {
        ids[j] = sectionIdx.length;
        sectionIdx.push(sec.index);
        this.candBlocks.push(sec.blocks);
      });
      return ids;
    });
    this.candSection = Int32Array.from(sectionIdx);
    this.n = sectionIdx.length;

    // Matriz de choques: solo entre candidatos de niveles distintos.
    const N = this.n;
    this.clash = new Uint8Array(N * N);
    for (let a = 0; a < L; a++) {
      for (let b = a + 1; b < L; b++) {
        for (const x of this.levels[a]) {
          for (const y of this.levels[b]) {
            if (overlaps(this.candBlocks[x], this.candBlocks[y])) {
              this.clash[x * N + y] = 1;
              this.clash[y * N + x] = 1;
            }
          }
        }
      }
    }

    this.prod = [];
    let p = 1;
    for (const lv of this.levels) this.prod.push((p *= lv.length));

    this.idx = new Int32Array(L);
    this.chosen = new Int32Array(L);
  }

  get exhausted(): boolean {
    return this.done;
  }

  /** Horarios encontrados hasta ahora. */
  get foundCount(): number {
    return this.found;
  }

  /** Candidatos revisados hasta ahora. */
  get explored(): number {
    return this.steps;
  }

  /** Fracción del árbol ya recorrida: monótona, llega a 1 al agotarse. */
  get progress(): number {
    if (this.done) return 1;
    let f = 0;
    for (let k = 0; k <= this.depth; k++) f += this.idx[k] / this.prod[k];
    return Math.min(f, 1);
  }

  /**
   * Avanza hasta encontrar `maxSchedules` horarios, agotar la búsqueda o
   * revisar `maxSteps` candidatos (lo que pase primero).
   */
  run(maxSchedules: number, maxSteps = Infinity): RunResult {
    const out: Schedule[] = [];
    const { levels, clash, n: N, idx, chosen } = this;
    const L = levels.length;
    let steps = 0;

    while (!this.done && out.length < maxSchedules && steps < maxSteps) {
      const d = this.depth;
      const lv = levels[d];
      if (idx[d] >= lv.length) {
        if (d === 0) {
          this.done = true;
          break;
        }
        this.depth = d - 1;
        idx[d - 1]++;
        continue;
      }
      steps++;
      const c = lv[idx[d]];
      let ok = true;
      const row = c * N;
      for (let k = 0; k < d; k++) {
        if (clash[row + chosen[k]]) {
          ok = false;
          break;
        }
      }
      if (!ok) {
        idx[d]++;
        continue;
      }
      chosen[d] = c;
      if (d === L - 1) {
        out.push(this.emit());
        idx[d]++;
      } else {
        this.depth = d + 1;
        idx[d + 1] = 0;
      }
    }
    this.steps += steps;
    return { schedules: out, exhausted: this.done };
  }

  private emit(): Schedule {
    const L = this.levels.length;
    const picks = new Array<number>(L);
    const blocks: Block[] = [];
    for (let k = 0; k < L; k++) {
      const c = this.chosen[k];
      picks[this.order[k]] = this.candSection[c];
      for (const b of this.candBlocks[c]) blocks.push(b);
    }
    return { n: this.found++, picks, stats: computeStats(blocks) };
  }
}

/** Genera todo de una vez (para tests y casos pequeños). */
export function generateAll(problem: Problem): { ok: true; schedules: Schedule[] } | GenerateError {
  const prep = prepareSearch(problem);
  if (!prep.ok) return prep;
  return { ok: true, schedules: prep.search.run(Infinity).schedules };
}
