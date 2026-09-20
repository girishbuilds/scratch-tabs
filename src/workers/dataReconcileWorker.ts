import { createReconcileResponse } from "../tablets/datareconcile/engine";
import { ReconcileInput } from "../tablets/datareconcile/types";

self.onmessage = ({ data }: MessageEvent<ReconcileInput>) => {
  self.postMessage(createReconcileResponse(data));
};
