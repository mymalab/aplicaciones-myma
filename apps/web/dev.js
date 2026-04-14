import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const childProcesses = [];
let isShuttingDown = false;

const startProcess = (name, command, args, options = {}) => {
  const child = spawn(command, args, {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
    shell: options.shell ?? false,
  });

  childProcesses.push(child);

  child.on('exit', (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    for (const processRef of childProcesses) {
      if (processRef.pid && processRef.pid !== child.pid) {
        processRef.kill('SIGTERM');
      }
    }

    if (signal) {
      console.error(`[dev] ${name} finalizo por senal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.error(`[dev] No fue posible iniciar ${name}:`, error);
    for (const processRef of childProcesses) {
      if (processRef.pid && processRef.pid !== child.pid) {
        processRef.kill('SIGTERM');
      }
    }
    process.exit(1);
  });

  return child;
};

const shutdown = () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  for (const child of childProcesses) {
    if (child.pid) {
      child.kill('SIGTERM');
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startProcess('backend', process.execPath, ['server.js']);
startProcess('vite', pnpmCommand, ['exec', 'vite'], {
  shell: process.platform === 'win32',
});
