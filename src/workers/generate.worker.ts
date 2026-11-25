import { BatchRunner } from "./runner";
import type { WorkerRequest, WorkerResponse } from "./protocol";

// El proyecto compila con la lib DOM; aquí solo hace falta esta parte del scope del worker.
const scope = self as unknown as {
  postMessage(msg: WorkerResponse): void;
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
};

// Cede el hilo con un MessageChannel: más rápido que setTimeout(0), que se
// limita a 4 ms tras varias llamadas anidadas.
const channel = new MessageChannel();
const waiting: (() => void)[] = [];
channel.port1.onmessage = () => waiting.shift()?.();

const runner = new BatchRunner({
  post: (msg) => scope.postMessage(msg),
  now: () => performance.now(),
  yieldToEvents: () =>
    new Promise<void>((resolve) => {
      waiting.push(resolve);
      channel.port2.postMessage(0);
    }),
});

scope.onmessage = (e) => {
  void runner.handle(e.data);
};
