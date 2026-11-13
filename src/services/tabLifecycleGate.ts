/**
 * Serialises tab lifecycle actions (close, move between workspaces) against
 * autosave.
 *
 * Those actions write IndexedDB first and update the in-memory stores after
 * some awaits. Autosave snapshots the stores, so a save that starts in that
 * window would write the tab (and its old workspace) back over the action's
 * own write. `saveState` waits for in-flight lifecycle actions before it takes
 * its snapshot.
 *
 * Lifecycle actions must not await `saveState` themselves.
 */
const inFlight = new Set<Promise<unknown>>();

export function runTabLifecycleAction<T>(action: () => Promise<T>): Promise<T> {
  const promise = action();
  inFlight.add(promise);
  const release = () => {
    inFlight.delete(promise);
  };
  promise.then(release, release);
  return promise;
}

export async function waitForTabLifecycleActions(): Promise<void> {
  while (inFlight.size > 0) {
    await Promise.allSettled([...inFlight]);
  }
}
