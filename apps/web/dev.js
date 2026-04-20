import { spawn } from 'child_process';
import { createRequire } from 'module';
import { createConnection } from 'net';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const vitePackagePath = require.resolve('vite/package.json');
const viteBinPath = join(dirname(vitePackagePath), 'bin', 'vite.js');

const childProcesses = [];
let isShuttingDown = false;

const isPortInUse = (port, host) =>
  new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let settled = false;

    socket.setTimeout(250);
    socket.once('connect', () => {
      settled = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(false);
    });
    socket.once('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      const unavailableErrorCodes = new Set([
        'ECONNREFUSED',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'EADDRNOTAVAIL',
      ]);
      resolve(!unavailableErrorCodes.has(error.code));
    });
  });

const isPortAvailable = async (port) => {
  if (await isPortInUse(port, '127.0.0.1')) {
    return false;
  }

  return !(await isPortInUse(port, '::1'));
};

const findAvailablePort = async (startPort, reservedPorts = new Set()) => {
  let port = startPort;

  while (reservedPorts.has(port) || !(await isPortAvailable(port))) {
    port += 1;
  }

  return port;
};

const startProcess = (name, command, args, options = {}) => {
  const child = spawn(command, args, {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...options.env,
    },
    shell: false,
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

const parsedFrontendPort = Number.parseInt(
  process.env.FRONTEND_PORT ?? process.env.VITE_PORT ?? '',
  10,
);
const preferredFrontendPort =
  Number.isFinite(parsedFrontendPort) && parsedFrontendPort > 0 ? parsedFrontendPort : 3000;
const parsedBackendPort = Number.parseInt(process.env.PORT ?? '', 10);
const preferredBackendPort =
  Number.isFinite(parsedBackendPort) && parsedBackendPort > 0 ? parsedBackendPort : 3001;

const main = async () => {
  const frontendPort = await findAvailablePort(preferredFrontendPort);
  const backendPort = await findAvailablePort(preferredBackendPort, new Set([frontendPort]));
  const internalApiProxyTarget =
    process.env.INTERNAL_API_PROXY_TARGET || `http://127.0.0.1:${backendPort}`;

  console.log(
    `[dev] frontend=http://localhost:${frontendPort} backend=${internalApiProxyTarget}`,
  );

  startProcess('backend', process.execPath, [join(__dirname, 'server.js')], {
    env: {
      PORT: String(backendPort),
    },
  });

  startProcess('vite', process.execPath, [viteBinPath, '--host', '0.0.0.0', '--port', String(frontendPort)], {
    env: {
      INTERNAL_API_PROXY_TARGET: internalApiProxyTarget,
    },
  });
};

main().catch((error) => {
  console.error('[dev] No fue posible iniciar el entorno de desarrollo:', error);
  process.exit(1);
});
