import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import { E2EWorld } from './world.js';
import * as net from 'net';
import * as http from 'http';
import { spawn, ChildProcess } from 'child_process';
import { acquireClipboardLock, releaseClipboardLock, CLIPBOARD_LOCK_TIMEOUT_MS } from './clipboardLock.js';

let browser: any;
let devServer: ChildProcess | null = null;

setDefaultTimeout(30 * 1000);

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo;
      const port = address.port;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
    server.on('error', reject);
  });
}

function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function poll() {
      http.get(url, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error(`Dev server at ${url} did not become ready within ${timeoutMs}ms`));
        } else {
          setTimeout(poll, 500);
        }
      });
    }
    poll();
  });
}

function killServer(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!proc || proc.exitCode !== null) {
      resolve();
      return;
    }
    proc.once('exit', () => resolve());
    proc.kill('SIGTERM');
    // Force-kill after 5 seconds if SIGTERM is ignored
    setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch (_) { /* already dead */ }
    }, 5000);
  });
}

BeforeAll({ timeout: 3 * 60 * 1000 }, async function () {
  // Allow opting out of auto-server when BASE_URL is already set (e.g. developer testing against a specific server)
  if (!process.env.BASE_URL) {
    // run-cucumber.cjs reserves a distinct port per shard; otherwise pick a free one.
    const port = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : await findFreePort();
    const baseUrl = `http://localhost:${port}`;

    devServer = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    devServer.stdout?.on('data', (chunk: Buffer) => {
      process.stdout.write(`[vite] ${chunk}`);
    });
    devServer.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(`[vite] ${chunk}`);
    });

    devServer.on('error', (err) => {
      console.error('[vite] Failed to start dev server:', err);
    });

    // Register signal handlers so Ctrl-C or SIGTERM also kills the dev server
    const cleanup = () => {
      if (devServer) killServer(devServer).finally(() => process.exit(1));
    };
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);

    await waitForServer(baseUrl);
    process.env.BASE_URL = baseUrl;
    console.log(`[hooks] Dev server ready at ${baseUrl}`);
  } else {
    console.log(`[hooks] Using existing server at ${process.env.BASE_URL}`);
  }

  browser = await chromium.launch({
    headless: process.env.HEADED !== 'true'
  });

  // A fresh dev server (and, when sharded, a fresh dep cache) compiles on first request, which can
  // exceed a scenario's 30s step timeout. Load the app once up front so scenarios hit a warm server.
  const warmupContext = await browser.newContext();
  try {
    const warmupPage = await warmupContext.newPage();
    await warmupPage.goto(process.env.BASE_URL!, { timeout: 2 * 60 * 1000 });
    await warmupPage.getByText('SCRATCH_TABS').waitFor({ timeout: 2 * 60 * 1000 });
    await warmupPage.waitForLoadState('networkidle');
  } finally {
    await warmupContext.close();
  }
});

AfterAll(async function () {
  await browser.close();
  if (devServer) {
    await killServer(devServer);
    devServer = null;
    console.log('[hooks] Dev server stopped');
  }
});

// Defined before the main Before/After so the lock is taken first and released last.
Before({ tags: '@clipboard', timeout: CLIPBOARD_LOCK_TIMEOUT_MS + 5000 }, async function () {
  await acquireClipboardLock();
});

After({ tags: '@clipboard' }, async function () {
  releaseClipboardLock();
});

Before(async function () {
  // Create context with clipboard permissions granted
  this.context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write']
  });
  this.page = await this.context.newPage();
  
  // Initialize the action helpers now that page is available
  this.initializeHelpers();
});

After(async function (params: any) {
  if (params.result?.status === 'FAILED') {
    const screenshot = await this.page.screenshot({
      path: `reports/screenshots/${params.pickle.name}.png`,
      fullPage: true,
    });
    this.attach(screenshot, 'image/png');
  }

  // Clean up any share-related contexts/pages
  if (this.share) {
    await this.share.cleanup();
  }
  if (this.canvasConflict) {
    await this.canvasConflict.cleanup();
  }

  await this.page.close();
  await this.context.close();
});
