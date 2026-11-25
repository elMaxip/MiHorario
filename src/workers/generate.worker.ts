/// <reference lib="webworker" />
import { BatchRunner } from "./runner";
import type { WorkerRequest, WorkerResponse } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

// Cede el hilo con un MessageChannel: más rápido que setTimeout(0), que se
// limita a 4 ms tras varias llamadas anidadas.
const channel = new MessageChannel();
const waiting: (() => void)[] = [];
channel.port1.onmessage = () => waiting.shift()?.();

const runner = new BatchRunner({
  post: (msg: WorkerResponse) => self.postMessage(msg),
  now: () => performance.now(),
  yieldToEvents: () =>
    new Promise<void>((resolve) => {
      waiting.push(resolve);
      channel.port2.postMessage(0);
    }),
});

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  void runner.handle(e.data);
};
