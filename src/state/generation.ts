import { atom, getDefaultStore } from "jotai";
import type { SectionScope } from "@/domain/fit";
import type { GenerateError } from "@/domain/generate";
import { buildProblem } from "@/domain/problem";
import type { Availability, Schedule, Subject } from "@/domain/types";
import { BATCH_SIZE, type WorkerRequest, type WorkerResponse } from "@/workers/protocol";

export type GenerationError = GenerateError | { ok: false; reason: "no-combinations" };

/** Resultado de `startGeneration`: primer horario, error, o reemplazada por otra búsqueda. */
export type StartResult = { ok: true } | GenerationError | { ok: false; reason: "superseded" };

export interface GenerationRequest {
  /** Asignaturas pedidas: `schedule.picks[i]` corresponde a `subjects[i]`. */
  subjects: Subject[];
  colors: number[];
  scope: SectionScope;
  availability: Availability;
  /** Identifica la combinación de entradas, para saber si los resultados siguen vigentes. */
  signature: string;
}

export interface GenerationState {
  request: GenerationRequest | null;
  schedules: Schedule[];
  running: boolean;
  exhausted: boolean;
  /** Encontrados en la tanda en curso. */
  batchFound: number;
  /** Fracción del árbol recorrida. */
  fraction: number;
  error: GenerationError | null;
}

const initial: GenerationState = {
  request: null,
  schedules: [],
  running: false,
  exhausted: false,
  batchFound: 0,
  fraction: 0,
  error: null,
};

export const generationAtom = atom<GenerationState>(initial);

export function signatureOf(
  subjectIds: readonly string[],
  scope: SectionScope,
  availability: Availability,
): string {
  return JSON.stringify([subjectIds, scope.carrera, scope.includeOtherCareers, availability]);
}

const store = getDefaultStore();
let worker: Worker | null = null;
let firstResult: ((r: StartResult) => void) | null = null;

const update = (fn: (s: GenerationState) => GenerationState) => store.set(generationAtom, fn);

function settleFirst(r: StartResult) {
  firstResult?.(r);
  firstResult = null;
}

function onMessage(e: MessageEvent<WorkerResponse>) {
  const msg = e.data;
  switch (msg.type) {
    case "progress":
      update((s) => ({
        ...s,
        schedules: msg.schedules.length ? s.schedules.concat(msg.schedules) : s.schedules,
        batchFound: msg.found,
        fraction: msg.fraction,
      }));
      if (msg.schedules.length) settleFirst({ ok: true });
      break;
    case "batch": {
      let empty = false;
      update((s) => {
        const schedules = msg.schedules.length ? s.schedules.concat(msg.schedules) : s.schedules;
        empty = schedules.length === 0 && msg.exhausted;
        return {
          ...s,
          schedules,
          running: false,
          exhausted: msg.exhausted,
          batchFound: 0,
          fraction: msg.fraction,
          error: empty ? { ok: false, reason: "no-combinations" } : null,
        };
      });
      if (empty) settleFirst({ ok: false, reason: "no-combinations" });
      else if (store.get(generationAtom).schedules.length) settleFirst({ ok: true });
      break;
    }
    case "error":
      update((s) => ({ ...s, running: false, error: msg.error }));
      settleFirst(msg.error);
      break;
  }
}

function send(msg: WorkerRequest) {
  worker?.postMessage(msg);
}

/**
 * Lanza una búsqueda nueva en un worker nuevo (termina el anterior para no
 * mezclar resultados). Resuelve con el primer horario o con el error.
 */
export function startGeneration(input: {
  subjects: Subject[];
  colors: number[];
  scope: SectionScope;
  availability: Availability;
}): Promise<StartResult> {
  worker?.terminate();
  settleFirst({ ok: false, reason: "superseded" });

  const request: GenerationRequest = {
    ...input,
    signature: signatureOf(
      input.subjects.map((s) => s.id),
      input.scope,
      input.availability,
    ),
  };
  store.set(generationAtom, { ...initial, request, running: true });

  worker = new Worker(new URL("../workers/generate.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = onMessage;
  worker.onerror = () => {
    update((s) => ({ ...s, running: false }));
    settleFirst({ ok: false, reason: "no-combinations" });
  };

  const promise = new Promise<StartResult>((resolve) => {
    firstResult = resolve;
  });
  send({
    type: "start",
    batchSize: BATCH_SIZE,
    problem: buildProblem(input.subjects, input.scope, input.availability),
  });
  return promise;
}

/** Pide la siguiente tanda, si quedan combinaciones y no hay una en curso. */
export function nextBatch(): void {
  const s = store.get(generationAtom);
  if (!worker || s.running || s.exhausted || !s.request) return;
  update((x) => ({ ...x, running: true, batchFound: 0 }));
  send({ type: "next" });
}

/** Detiene la tanda en curso y conserva lo ya encontrado. */
export function cancelBatch(): void {
  if (store.get(generationAtom).running) send({ type: "cancel" });
}
