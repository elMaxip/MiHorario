import { describe, expect, it } from "vitest";
import { buildProblem } from "@/domain/problem";
import { loadFixture, nivel3Diurno, sameEveryDay } from "@/domain/testing";
import { BatchRunner } from "./runner";
import type { WorkerResponse } from "./protocol";

const ALL = { carrera: null, includeOtherCareers: false };
const problem = () => buildProblem(nivel3Diurno(loadFixture("Horario.xlsx")), ALL, sameEveryDay(480, 1140));
const key = (s: { picks: number[] }) => s.picks.join(",");

function setup(chunkSteps = 5) {
  const messages: WorkerResponse[] = [];
  let t = 0;
  const pending: (() => void)[] = [];
  const runner = new BatchRunner({
    post: (m) => messages.push(m),
    now: () => (t += 20),
    yieldToEvents: () => new Promise((r) => pending.push(r)),
    chunkSteps,
  });
  /** Deja avanzar `n` cesiones del hilo. */
  const tick = async (n = 1) => {
    for (let i = 0; i < n; i++) {
      pending.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    }
  };
  const drain = async () => {
    while (pending.length) await tick();
  };
  return { runner, messages, tick, drain };
}

const batches = (m: WorkerResponse[]) => m.filter((x) => x.type === "batch");

/** Horarios por tanda: los que llegaron en `progress` más los del `batch`. */
function perBatch(messages: WorkerResponse[]) {
  const out: string[][] = [];
  let cur: string[] = [];
  for (const m of messages) {
    if (m.type === "error") continue;
    cur.push(...m.schedules.map(key));
    if (m.type === "batch") {
      out.push(cur);
      cur = [];
    }
  }
  return out;
}

describe("BatchRunner", () => {
  it("genera por tandas de 100 hasta agotar, igual que todo de una vez", async () => {
    const { runner, messages, drain } = setup(50);
    const done = runner.handle({ type: "start", problem: problem() });
    await drain();
    await done;
    for (let i = 0; i < 10; i++) {
      const last = batches(messages).at(-1);
      if (last?.type === "batch" && last.exhausted) break;
      const p = runner.handle({ type: "next" });
      await drain();
      await p;
    }
    const bs = batches(messages);
    expect(perBatch(messages).map((b) => b.length)).toEqual([100, 100, 100, 100, 100, 100, 100, 21]);
    const last = bs.at(-1)!;
    expect(last.type === "batch" && last.exhausted && last.fraction).toBe(1);
    const all = perBatch(messages).flat();
    expect(new Set(all).size).toBe(721);
  });

  it("cancel conserva lo encontrado; next sigue sin perder ni repetir", async () => {
    const { runner, messages, tick, drain } = setup(5);
    const first = runner.handle({ type: "start", problem: problem() });
    await tick(3);
    await runner.handle({ type: "cancel" });
    await drain();
    await first;
    const cancelled = batches(messages)[0];
    expect(cancelled.type === "batch" && cancelled.cancelled).toBe(true);
    expect(perBatch(messages)[0].length).toBeLessThan(100);

    while (!(batches(messages).at(-1) as { exhausted?: boolean }).exhausted) {
      const p = runner.handle({ type: "next" });
      await drain();
      await p;
    }
    const all = perBatch(messages).flat();
    expect(all).toHaveLength(721);
    expect(new Set(all).size).toBe(721);
    const ns = messages.flatMap((m) => (m.type === "error" ? [] : m.schedules.map((s) => s.n)));
    expect(ns).toEqual([...Array(721).keys()]);
  });

  it("informa progreso monótono, espaciado, con lo encontrado en la tanda", async () => {
    const { runner, messages, drain } = setup(5);
    const p = runner.handle({ type: "start", problem: problem() });
    await drain();
    await p;
    const progress = messages.filter((m) => m.type === "progress");
    expect(progress.length).toBeGreaterThan(0);
    // El primer horario llega en un mensaje de progreso, antes de completar la tanda.
    expect(progress.find((m) => m.type === "progress" && m.schedules.length)).toBeDefined();
    let last = 0;
    for (const m of progress) {
      if (m.type !== "progress") continue;
      expect(m.fraction).toBeGreaterThanOrEqual(last);
      expect(m.found).toBeLessThanOrEqual(100);
      last = m.fraction;
    }
  });

  it("devuelve los errores del dominio", async () => {
    const { runner, messages } = setup();
    await runner.handle({ type: "start", problem: { subjects: [], availability: sameEveryDay(480, 840) } });
    expect(messages).toEqual([{ type: "error", error: { ok: false, reason: "no-subjects" } }]);
  });
});
