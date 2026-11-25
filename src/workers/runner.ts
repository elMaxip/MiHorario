import { prepareSearch, type ScheduleSearch } from "@/domain/generate";
import type { Schedule } from "@/domain/types";
import { BATCH_SIZE, PROGRESS_INTERVAL, type WorkerRequest, type WorkerResponse } from "./protocol";

/** Candidatos que se revisan antes de ceder el hilo para atender mensajes. */
const CHUNK_STEPS = 4000;

export interface RunnerEnv {
  post: (msg: WorkerResponse) => void;
  now: () => number;
  /** Cede el hilo para que lleguen mensajes (`cancel`). */
  yieldToEvents: () => Promise<void>;
  chunkSteps?: number;
}

/**
 * Lógica del worker, separada de `postMessage` para poder probarla.
 * Conserva el recorrido entre mensajes: `next` sigue donde quedó.
 */
export class BatchRunner {
  private search: ScheduleSearch | null = null;
  private batchSize = BATCH_SIZE;
  private running = false;
  private cancelRequested = false;
  private firstSent = false;
  private readonly env: RunnerEnv;

  constructor(env: RunnerEnv) {
    this.env = env;
  }

  /** Resuelve cuando termina la tanda que haya lanzado el mensaje, si la hay. */
  handle(msg: WorkerRequest): Promise<void> {
    switch (msg.type) {
      case "start": {
        const prep = prepareSearch(msg.problem);
        if (!prep.ok) {
          this.search = null;
          this.env.post({ type: "error", error: prep });
          return Promise.resolve();
        }
        this.search = prep.search;
        this.firstSent = false;
        this.batchSize = msg.batchSize ?? BATCH_SIZE;
        return this.runBatch();
      }
      case "next":
        return this.runBatch();
      case "cancel":
        if (this.running) this.cancelRequested = true;
        return Promise.resolve();
    }
  }

  private async runBatch(): Promise<void> {
    const search = this.search;
    if (!search || this.running) return;
    this.running = true;
    this.cancelRequested = false;
    const { post, now, yieldToEvents } = this.env;
    const chunk = this.env.chunkSteps ?? CHUNK_STEPS;
    let found = 0;
    let unsent: Schedule[] = [];
    let lastPost = now();

    while (found < this.batchSize && !search.exhausted && !this.cancelRequested) {
      const r = search.run(this.batchSize - found, chunk);
      found += r.schedules.length;
      for (const s of r.schedules) unsent.push(s);
      if (found >= this.batchSize || search.exhausted) break;
      // El primer horario de la búsqueda sale de inmediato; luego, cada ~50 ms.
      const first = !this.firstSent && unsent.length > 0;
      if (first || now() - lastPost >= PROGRESS_INTERVAL) {
        lastPost = now();
        if (unsent.length) this.firstSent = true;
        post({
          type: "progress",
          schedules: unsent,
          found,
          explored: search.explored,
          fraction: search.progress,
        });
        unsent = [];
      }
      await yieldToEvents();
    }

    const cancelled = this.cancelRequested;
    this.running = false;
    this.cancelRequested = false;
    post({
      type: "batch",
      schedules: unsent,
      exhausted: search.exhausted,
      cancelled,
      fraction: search.progress,
    });
  }
}
