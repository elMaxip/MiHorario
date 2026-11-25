import type { GenerateError, Problem } from "@/domain/generate";
import type { Schedule } from "@/domain/types";

/** Horarios por tanda. */
export const BATCH_SIZE = 100;

/** Intervalo mínimo entre mensajes de progreso, en ms. */
export const PROGRESS_INTERVAL = 50;

export type WorkerRequest =
  | { type: "start"; problem: Problem; batchSize?: number }
  | { type: "next" }
  | { type: "cancel" };

export interface Progress {
  /** Horarios nuevos desde el mensaje anterior (para mostrar el primero cuanto antes). */
  schedules: Schedule[];
  /** Horarios encontrados en la tanda en curso. */
  found: number;
  /** Candidatos revisados desde el inicio de la búsqueda. */
  explored: number;
  /** Fracción del árbol de búsqueda recorrida (0 a 1). */
  fraction: number;
}

export type WorkerResponse =
  | ({ type: "progress" } & Progress)
  | {
      type: "batch";
      /** Los horarios de la tanda que no llegaron ya en mensajes `progress`. */
      schedules: Schedule[];
      /** No hay más combinaciones. */
      exhausted: boolean;
      /** La tanda terminó antes por un `cancel`. */
      cancelled: boolean;
      fraction: number;
    }
  | { type: "error"; error: GenerateError };
