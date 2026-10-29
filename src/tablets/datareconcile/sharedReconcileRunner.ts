import { createReconcileCache } from "./reconcileCache";
import { createReconcileRunner } from "./reconcileRunner";
import { createReconcileWorker } from "./reconcileWorkerClient";

/** The runner every Data Reconcile tablet shares, so results outlive any single tablet instance. */
export const reconcileRunner = createReconcileRunner({ createWorker: createReconcileWorker, cache: createReconcileCache(3) });
