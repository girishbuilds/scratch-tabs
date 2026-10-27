import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { BrowserContext, Route } from '@playwright/test';

/**
 * Serves the app's third-party assets (Monaco from jsdelivr, Google Fonts) from a local disk cache.
 *
 * Every scenario gets a fresh browser context with an empty HTTP cache, so each page load would
 * otherwise re-download several MB from public CDNs. The fonts stylesheet blocks `load` and
 * `networkidle` waits on all of it, so a slow CDN response (worse with parallel shards) surfaced as
 * random 30s timeouts in "I am on the homepage". Responses are fetched once, then reused by every
 * context, shard and later run.
 */
const CDN_HOSTS = new Set(['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com']);
const CACHE_DIR = path.join(process.cwd(), 'node_modules', '.cache', 'scratch-tabs-e2e-cdn');
const FETCH_TIMEOUT_MS = 20 * 1000;
const DROPPED_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection']);

interface StoredResponse {
  status: number;
  headers: Record<string, string>;
  body: string; // base64
}

interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}

// Decoded entries, so the disk read, JSON parse and base64 decode (Monaco is about 5 MB) happen once
// per process instead of once per request, which would block this process's event loop.
const memory = new Map<string, CachedResponse>();

// One in-flight fetch per URL so concurrent scenarios in this process don't all hit the CDN.
const inflight = new Map<string, Promise<CachedResponse | null>>();

function cachePath(url: string, userAgent: string): string {
  // Google Fonts returns different CSS per user agent.
  const key = crypto.createHash('sha1').update(`${url}\n${userAgent}`).digest('hex');
  return path.join(CACHE_DIR, `${key}.json`);
}

function readCached(file: string): CachedResponse | null {
  const hit = memory.get(file);
  if (hit) return hit;
  try {
    const stored: StoredResponse = JSON.parse(fs.readFileSync(file, 'utf8'));
    const entry = { ...stored, body: Buffer.from(stored.body, 'base64') };
    memory.set(file, entry);
    return entry;
  } catch {
    return null;
  }
}

async function download(url: string, userAgent: string, file: string): Promise<CachedResponse | null> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': userAgent },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const headers: Record<string, string> = {};
    res.headers.forEach((value, name) => {
      if (!DROPPED_HEADERS.has(name)) headers[name] = value;
    });
    const body = Buffer.from(await res.arrayBuffer());
    const stored: StoredResponse = { status: res.status, headers, body: body.toString('base64') };

    // Write via rename so a concurrent shard never reads a half-written file.
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(stored));
    fs.renameSync(tmp, file);
    const entry = { status: stored.status, headers, body };
    memory.set(file, entry);
    return entry;
  } catch {
    return null;
  }
}

async function handle(route: Route): Promise<void> {
  const request = route.request();
  if (request.method() !== 'GET') return route.fallback();

  const url = request.url();
  const userAgent = request.headers()['user-agent'] ?? '';
  const file = cachePath(url, userAgent);

  let entry = readCached(file);
  if (!entry) {
    let pending = inflight.get(file);
    if (!pending) {
      pending = download(url, userAgent, file).finally(() => inflight.delete(file));
      inflight.set(file, pending);
    }
    entry = await pending;
  }

  // Cache miss and the CDN is unreachable: let the browser try the network itself.
  if (!entry) return route.fallback();

  await route.fulfill({
    status: entry.status,
    headers: { ...entry.headers, 'access-control-allow-origin': '*' },
    body: entry.body,
  });
}

export async function installCdnCache(context: BrowserContext): Promise<void> {
  if (process.env.E2E_NO_CDN_CACHE === '1') return;
  await context.route((url) => CDN_HOSTS.has(url.hostname), handle);
}
