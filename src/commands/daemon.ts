import { Command } from 'commander';
import { readFile, writeFile, unlink, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fork } from 'node:child_process';
import process from 'node:process';
import { Output } from '../output/manager.js';
import { DaemonService } from '../services/daemonService.js';
import { config } from '../config/index.js';
import type { DaemonEvent } from '../services/notifier.js';

const DAEMON_DIR = join(homedir(), '.julius-cli');
const PID_FILE = join(DAEMON_DIR, 'daemon.pid');
const EVENT_LOG = join(DAEMON_DIR, 'daemon-events.ndjson');

async function ensureDaemonDir(): Promise<void> {
  const { mkdir } = await import('node:fs/promises');
  try {
    await access(DAEMON_DIR, constants.F_OK);
  } catch {
    await mkdir(DAEMON_DIR, { recursive: true });
  }
}

async function writePidFile(pid: number): Promise<void> {
  await ensureDaemonDir();
  await writeFile(PID_FILE, String(pid), 'utf-8');
}

async function readPidFile(): Promise<number | null> {
  try {
    await access(PID_FILE, constants.F_OK);
    const content = await readFile(PID_FILE, 'utf-8');
    const pid = parseInt(content.trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    return process.kill(pid, 0);
  } catch {
    return false;
  }
}

async function removePidFile(): Promise<void> {
  try {
    await unlink(PID_FILE);
  } catch {
    // File may already be gone
  }
}

function formatEventForDisplay(event: DaemonEvent): string {
  const timestamp = new Date().toLocaleTimeString();
  const label = event.sessionId === 'daemon'
    ? 'DAEMON'
    : event.sessionId.slice(0, 12);

  switch (event.type) {
    case 'state_change':
      return `[${timestamp}] [${label}] State: ${event.from || 'NEW'} → ${event.to}`;
    case 'needs_approval':
      return `[${timestamp}] [${label}] ⚠ Approval needed`;
    case 'new_message':
      return `[${timestamp}] [${label}] Message from ${event.author}`;
    case 'completed':
      return `[${timestamp}] [${label}] ✓ Completed${event.outputs ? ` — ${event.outputs}` : ''}`;
    case 'failed':
      return `[${timestamp}] [${label}] ✗ Failed`;
    case 'error':
      return `[${timestamp}] [${label}] Error: ${event.message}`;
  }
}

async function startBackgroundDaemon(): Promise<void> {
  const existingPid = await readPidFile();
  if (existingPid && isProcessRunning(existingPid)) {
    Output.info(`Daemon already running (PID ${existingPid})`);
    return;
  }

  await ensureDaemonDir();

  const child = fork(
    process.argv[1],
    ['daemon', '--foreground'],
    {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore', 'pipe'],
      env: { ...process.env, JULIUS_DAEMON: '1' },
    }
  );

  if (!child.pid) {
    Output.error('Failed to start daemon');
    return;
  }

  child.unref();
  await writePidFile(child.pid);

  const logFd = await import('node:fs/promises').then(m => m.open(EVENT_LOG, 'a'));
  child.on('message', (msg: any) => {
    logFd.writeFile(JSON.stringify(msg) + '\n');
  });

  Output.info(`Daemon started (PID ${child.pid})`);
  Output.info(`Event log: ${EVENT_LOG}`);
}

async function stopBackgroundDaemon(): Promise<void> {
  const pid = await readPidFile();
  if (!pid) {
    Output.info('Daemon is not running');
    return;
  }

  if (!isProcessRunning(pid)) {
    Output.info('Daemon process already exited');
    await removePidFile();
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    Output.info(`Daemon (PID ${pid}) stopped`);
    await removePidFile();
  } catch (err) {
    Output.error(`Failed to stop daemon: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function daemonStatus(): Promise<void> {
  const pid = await readPidFile();
  if (pid && isProcessRunning(pid)) {
    Output.info(`Daemon is running (PID ${pid})`);
    Output.info(`Event log: ${EVENT_LOG}`);
    Output.info('Run `julius-cli daemon stop` to stop');
  } else {
    if (pid) {
      await removePidFile();
    }
    Output.info('Daemon is not running');
    Output.info('Run `julius-cli daemon start` to start');
  }
}

async function runForeground(options: {
  pollInterval?: number;
  json?: boolean;
}): Promise<void> {
  Output.info('Daemon mode (foreground). Events will show below.');
  Output.info(`Poll interval: ${options.pollInterval ?? 30000}ms`);
  Output.info('Press Ctrl+C to stop.\n');

  const daemonService = new DaemonService({
    pollInterval: options.pollInterval,
    onEvent: (event) => {
      if (options.json) {
        Output.log(JSON.stringify({
          daemon: true,
          timestamp: new Date().toISOString(),
          ...event,
        }));
      } else {
        Output.info(formatEventForDisplay(event));
      }
    },
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    Output.info('\nShutting down daemon...');
    daemonService.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await daemonService.start();
}

export function createDaemonCommand(): Command {
  const cmd = new Command('daemon')
    .description('Monitor sessions and send notifications on state changes')
    .option('--json', 'Output events as JSON (default in foreground mode)')
    .option('--interval <seconds>', 'Poll interval in seconds', parseFloat)
    .argument('[action]', 'Action: start | stop | status', undefined)
    .action(async (action: string | undefined, options: { json?: boolean; interval?: number }) => {
      const pollInterval = options.interval ? options.interval * 1000 : undefined;

      if (action === 'start') {
        await startBackgroundDaemon();
      } else if (action === 'stop') {
        await stopBackgroundDaemon();
      } else if (action === 'status') {
        await daemonStatus();
      } else {
        await runForeground({ pollInterval, json: options.json });
      }
    });

  return cmd;
}
