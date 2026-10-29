import { isSameInput, ReconcileCache } from "./reconcileCache";
import type { ReconcileWorkerClient } from "./reconcileWorkerClient";
import { ReconcileInput, ReconcileResponse } from "./types";

export type ReconcileListener = (response: ReconcileResponse) => void;

export interface ReconcileSubscription {
  release(): void;
}

export interface ReconcileRunner {
  /** Finished response for this exact input, if one is cached. */
  peek(input: ReconcileInput): ReconcileResponse | undefined;
  /** Delivers the response to `listener`, from the cache, a running job, or a new worker. */
  run(input: ReconcileInput, listener: ReconcileListener): ReconcileSubscription;
  /** Drops cached results and stops every running job. */
  clear(): void;
}

interface Job {
  input: ReconcileInput;
  worker: ReconcileWorkerClient;
  listeners: Set<ReconcileListener>;
}

const FAILURE: ReconcileResponse = { error: "Comparison failed." };

interface RunnerDeps {
  createWorker: () => ReconcileWorkerClient;
  cache: ReconcileCache;
}

/**
 * Owns the comparison workers independently of any component, so a job keeps running
 * (and its result is cached) while the tablet is unmounted. A job nobody listens to is
 * stopped as soon as another job starts, which bounds leftover work to one job.
 */
export function createReconcileRunner({ createWorker, cache }: RunnerDeps): ReconcileRunner {
  let jobs: Job[] = [];

  const stop = (job: Job) => {
    job.worker.terminate();
    jobs = jobs.filter((candidate) => candidate !== job);
  };

  const settle = (job: Job, response: ReconcileResponse, cacheable: boolean) => {
    if (!jobs.includes(job)) return;
    stop(job);
    if (cacheable) cache.set(job.input, response);
    job.listeners.forEach((listener) => listener(response));
  };

  const start = (input: ReconcileInput): Job => {
    jobs.filter((job) => job.listeners.size === 0).forEach(stop);
    const job: Job = { input, worker: createWorker(), listeners: new Set() };
    job.worker.onmessage = ({ data }) => settle(job, data, true);
    job.worker.onerror = () => settle(job, FAILURE, false);
    jobs.push(job);
    return job;
  };

  return {
    peek: (input) => cache.get(input),
    run(input, listener) {
      const cached = cache.get(input);
      if (cached) {
        listener(cached);
        return { release: () => undefined };
      }
      const running = jobs.find((job) => isSameInput(job.input, input));
      const job = running ?? start(input);
      job.listeners.add(listener);
      if (!running) job.worker.postMessage(input);
      return { release: () => { job.listeners.delete(listener); } };
    },
    clear() {
      [...jobs].forEach(stop);
      cache.clear();
    },
  };
}
