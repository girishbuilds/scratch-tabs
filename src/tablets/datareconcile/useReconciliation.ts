import { useEffect, useState } from "react";
import { reconcileRunner } from "./sharedReconcileRunner";
import { ReconcileInput, ReconcileResponse, ReconcileResult } from "./types";

export const emptyResult: ReconcileResult = { inBoth: [], changed: [], onlyA: [], onlyB: [] };

interface ReconciliationState {
  response: ReconcileResponse | null;
  isProcessing: boolean;
}

const initialState = (input: ReconcileInput | null): ReconciliationState => {
  const response = input ? reconcileRunner.peek(input) ?? null : null;
  return { response, isProcessing: input !== null && response === null };
};

/**
 * Compares the input off the main thread. The previous response stays available
 * while a new one is computed, so the view does not blank out between runs.
 */
export function useReconciliation(input: ReconcileInput | null) {
  const [state, setState] = useState(() => initialState(input));

  useEffect(() => {
    if (!input) { setState({ response: null, isProcessing: false }); return; }
    setState((current) => ({ ...current, isProcessing: true }));
    const subscription = reconcileRunner.run(input, (response) => setState({ response, isProcessing: false }));
    return subscription.release;
  }, [input]);

  const { response, isProcessing } = state;
  return {
    result: response?.result ?? { ...emptyResult, headers: response?.headers },
    error: response?.error ?? null,
    hasResponse: response !== null,
    isProcessing,
  };
}
