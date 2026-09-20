import { ReconcileInput, ReconcileResponse } from "./types";

export interface ReconcileWorkerClient {
  onmessage: ((event: MessageEvent<ReconcileResponse>) => void) | null;
  postMessage(input: ReconcileInput): void;
  terminate(): void;
}

export const createReconcileWorker = (): ReconcileWorkerClient =>
  new Worker(new URL("../../workers/dataReconcileWorker.ts", import.meta.url), { type: "module" });
