#!/usr/bin/env node

const { spawn } = require('child_process');
const net = require('net');
const os = require('os');
const path = require('path');
const readline = require('readline');

// Set environment variables to handle CommonJS modules
process.env.NODE_OPTIONS = '--require ts-node/register';

// Pull out --shards N / --shards=N; everything else goes straight to cucumber-js.
// E2E_SHARDS is the env equivalent. 1 (the default) runs a single cucumber-js process.
const rawArgs = process.argv.slice(2);
const cucumberArgs = [];
let shardsArg = process.env.E2E_SHARDS;
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--shards') {
    shardsArg = rawArgs[++i];
  } else if (rawArgs[i].startsWith('--shards=')) {
    shardsArg = rawArgs[i].slice('--shards='.length);
  } else {
    cucumberArgs.push(rawArgs[i]);
  }
}

const shards = shardsArg === 'auto'
  ? Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)))
  : parseInt(shardsArg ?? '1', 10);
if (!Number.isInteger(shards) || shards < 1) {
  console.error(`Invalid shard count "${shardsArg}": expected a positive integer or "auto"`);
  process.exit(2);
}

const children = new Set();

// Forward signals so that AfterAll hooks in hooks.ts (which kill the dev server) still run
function forwardSignal(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}
process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

// Reserve `count` distinct free ports by holding every listener open until all are
// allocated, so two shards can never be handed the same port.
async function reservePorts(count) {
  const servers = await Promise.all(
    Array.from({ length: count }, () => new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve(server));
    })),
  );
  const ports = servers.map((s) => s.address().port);
  await Promise.all(servers.map((s) => new Promise((resolve) => s.close(resolve))));
  return ports;
}

function run(args, env, label) {
  return new Promise((resolve) => {
    const child = spawn('npx', ['cucumber-js', ...args], {
      stdio: label ? ['inherit', 'pipe', 'pipe'] : 'inherit',
      env,
    });
    children.add(child);

    if (label) {
      for (const [stream, out] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
        readline.createInterface({ input: stream }).on('line', (line) => {
          out.write(`${label} ${line}\n`);
        });
      }
    }

    child.on('close', (code) => {
      children.delete(child);
      resolve(code ?? 1);
    });
  });
}

async function main() {
  if (shards === 1) {
    process.exit(await run(cucumberArgs, { ...process.env }));
  }

  // Each shard is its own cucumber-js process, so each gets its own dev server on its own
  // port (own origin) and its own Vite dep cache. Scenarios also run in fresh Playwright
  // browser contexts, so IndexedDB is never shared between scenarios or shards.
  // If BASE_URL is preset, hooks.ts skips spawning servers and every shard uses that one.
  const ports = process.env.BASE_URL ? [] : await reservePorts(shards);
  console.log(`Running E2E tests in ${shards} shards${ports.length ? ` on ports ${ports.join(', ')}` : ''}`);

  const started = Date.now();
  const results = await Promise.all(
    Array.from({ length: shards }, (_, i) => {
      const index = i + 1;
      const env = {
        ...process.env,
        E2E_SHARD: `${index}/${shards}`,
        VITE_CACHE_DIR: path.join('node_modules', '.vite-e2e', `shard-${index}`),
      };
      if (ports.length) env.E2E_PORT = String(ports[i]);

      // The progress bar and a shared report file can't be used by concurrent processes.
      const args = [
        ...cucumberArgs,
        '--tags', 'not @serial',
        '--shard', `${index}/${shards}`,
        '--format', 'summary',
        '--format', `html:reports/cucumber-report-shard-${index}.html`,
      ];
      return run(args, env, `[shard ${index}/${shards}]`);
    }),
  );

  // @serial scenarios (native Monaco right-click menus) only pass with nothing else running, so
  // they get a single process once the shards are done. Shards skip them via the tag expression.
  const serialCode = await run(
    [...cucumberArgs, '--tags', '@serial', '--format', 'summary', '--format', 'html:reports/cucumber-report-serial.html'],
    { ...process.env, E2E_SHARD: 'serial' },
    '[serial]',
  );
  results.push(serialCode);

  const failed = results.map((code, i) => (code === 0 ? null : i < shards ? i + 1 : 'serial')).filter(Boolean);
  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  console.log(
    failed.length
      ? `\nE2E failed in shard(s) ${failed.join(', ')} after ${minutes}m (reports/cucumber-report-*.html)`
      : `\nAll ${shards} E2E shards and the serial pass passed in ${minutes}m`,
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
