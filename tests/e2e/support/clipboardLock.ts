import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Cross-process mutex for scenarios tagged @clipboard.
 *
 * The OS clipboard is shared by every browser on the machine, so sharded runs that copy/paste
 * concurrently overwrite each other. Holding this lock for the duration of such a scenario makes
 * the shards take turns on them; every other scenario still runs in parallel.
 */
const LOCK_DIR = path.join(os.tmpdir(), 'scratch-tabs-e2e-clipboard.lock');
const STALE_AFTER_MS = 5 * 60 * 1000;
export const CLIPBOARD_LOCK_TIMEOUT_MS = 10 * 60 * 1000;

function isStale(): boolean {
  try {
    const pid = Number(fs.readFileSync(path.join(LOCK_DIR, 'pid'), 'utf8'));
    process.kill(pid, 0); // throws if the owner is gone
    return Date.now() - fs.statSync(LOCK_DIR).mtimeMs > STALE_AFTER_MS;
  } catch {
    return true;
  }
}

export async function acquireClipboardLock(): Promise<void> {
  const deadline = Date.now() + CLIPBOARD_LOCK_TIMEOUT_MS;
  for (;;) {
    // Build the lock dir (with its pid) privately, then rename it into place. The rename is
    // atomic and fails if another shard already holds the lock, so no one sees a half-made lock.
    const staging = fs.mkdtempSync(`${LOCK_DIR}.${process.pid}.`);
    fs.writeFileSync(path.join(staging, 'pid'), String(process.pid));
    try {
      fs.renameSync(staging, LOCK_DIR);
      return;
    } catch (err: any) {
      fs.rmSync(staging, { recursive: true, force: true });
      if (err.code !== 'EEXIST' && err.code !== 'ENOTEMPTY') throw err;
      if (isStale()) {
        releaseClipboardLock();
        continue;
      }
      if (Date.now() > deadline) throw new Error('Timed out waiting for the @clipboard lock');
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

export function releaseClipboardLock(): void {
  // Rename first so the lock is gone atomically; deleting in place could race with the next
  // shard moving its own lock into the same path.
  const trash = `${LOCK_DIR}.${process.pid}.released`;
  try {
    fs.renameSync(LOCK_DIR, trash);
  } catch {
    return;
  }
  fs.rmSync(trash, { recursive: true, force: true });
}
