import { createReconcileCache } from "../reconcileCache";
import { createReconcileRunner } from "../reconcileRunner";
import { ReconcileWorkerClient } from "../reconcileWorkerClient";
import { ReconcileInput, ReconcileResponse } from "../types";

const options: ReconcileInput["options"] = {
  mode: "line",
  normalization: { trim: true, ignoreCase: false, collapseWhitespace: false },
  scopeA: { kind: "all" },
  scopeB: { kind: "all" },
  keyPairs: [],
};
const input = (a: string): ReconcileInput => ({ a, b: "b", options });
const done = (label: string): ReconcileResponse => ({ error: label });

class FakeWorker implements ReconcileWorkerClient {
  onmessage: ReconcileWorkerClient["onmessage"] = null;
  onerror: ReconcileWorkerClient["onerror"] = null;
  postMessage = jest.fn();
  terminate = jest.fn();
  reply(response: ReconcileResponse) { this.onmessage?.({ data: response } as MessageEvent<ReconcileResponse>); }
  fail() { this.onerror?.({} as ErrorEvent); }
}

const setup = () => {
  const workers: FakeWorker[] = [];
  const runner = createReconcileRunner({
    createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker; },
    cache: createReconcileCache(3),
  });
  return { runner, workers };
};

describe("createReconcileRunner", () => {
  it("posts the input to a new worker and delivers its response", () => {
    const { runner, workers } = setup();
    const listener = jest.fn();
    runner.run(input("a"), listener);

    expect(workers).toHaveLength(1);
    expect(workers[0].postMessage).toHaveBeenCalledWith(input("a"));
    workers[0].reply(done("one"));
    expect(listener).toHaveBeenCalledWith(done("one"));
    expect(workers[0].terminate).toHaveBeenCalled();
  });

  it("serves a finished comparison from the cache without a new worker", () => {
    const { runner, workers } = setup();
    runner.run(input("a"), jest.fn());
    workers[0].reply(done("one"));

    const listener = jest.fn();
    runner.run(input("a"), listener);

    expect(listener).toHaveBeenCalledWith(done("one"));
    expect(workers).toHaveLength(1);
    expect(runner.peek(input("a"))).toEqual(done("one"));
  });

  it("shares one worker between identical in-flight requests", () => {
    const { runner, workers } = setup();
    const first = jest.fn();
    const second = jest.fn();
    runner.run(input("a"), first);
    runner.run(input("a"), second);
    workers[0].reply(done("one"));

    expect(workers).toHaveLength(1);
    expect(workers[0].postMessage).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(done("one"));
    expect(second).toHaveBeenCalledWith(done("one"));
  });

  it("lets a job finish and cache its result after the listener is released", () => {
    const { runner, workers } = setup();
    const listener = jest.fn();
    runner.run(input("a"), listener).release();

    expect(workers[0].terminate).not.toHaveBeenCalled();
    workers[0].reply(done("one"));

    expect(listener).not.toHaveBeenCalled();
    expect(runner.peek(input("a"))).toEqual(done("one"));
  });

  it("resumes an abandoned in-flight job instead of restarting it", () => {
    const { runner, workers } = setup();
    runner.run(input("a"), jest.fn()).release();
    const listener = jest.fn();
    runner.run(input("a"), listener);
    workers[0].reply(done("one"));

    expect(workers).toHaveLength(1);
    expect(listener).toHaveBeenCalledWith(done("one"));
  });

  it("stops an abandoned job when a different one starts", () => {
    const { runner, workers } = setup();
    runner.run(input("a"), jest.fn()).release();
    runner.run(input("b"), jest.fn());

    expect(workers[0].terminate).toHaveBeenCalled();
    expect(workers[1].terminate).not.toHaveBeenCalled();
  });

  it("keeps a job that still has a listener when another one starts", () => {
    const { runner, workers } = setup();
    runner.run(input("a"), jest.fn());
    runner.run(input("b"), jest.fn());

    expect(workers[0].terminate).not.toHaveBeenCalled();
  });

  it("reports a worker crash as an error and does not cache it", () => {
    const { runner, workers } = setup();
    const listener = jest.fn();
    runner.run(input("a"), listener);
    workers[0].fail();

    expect(listener).toHaveBeenCalledWith({ error: "Comparison failed." });
    expect(workers[0].terminate).toHaveBeenCalled();
    expect(runner.peek(input("a"))).toBeUndefined();
  });

  it("ignores a late message from a job that was already stopped", () => {
    const { runner, workers } = setup();
    const listener = jest.fn();
    runner.run(input("a"), listener);
    runner.clear();
    workers[0].reply(done("late"));

    expect(listener).not.toHaveBeenCalled();
    expect(runner.peek(input("a"))).toBeUndefined();
  });

  it("clear stops running jobs and drops cached results", () => {
    const { runner, workers } = setup();
    runner.run(input("a"), jest.fn());
    workers[0].reply(done("one"));
    runner.run(input("b"), jest.fn());
    runner.clear();

    expect(workers[1].terminate).toHaveBeenCalled();
    expect(runner.peek(input("a"))).toBeUndefined();
  });
});
