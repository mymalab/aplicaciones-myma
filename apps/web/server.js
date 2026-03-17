import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import http from 'http';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const normalizeBaseUrl = (baseUrl) => `${baseUrl ?? ''}`.trim().replace(/\/+$/, '');
const ACREDITACION_LEGACY_API_BASE_URL =
  normalizeBaseUrl(process.env.ACREDITACION_LEGACY_API_BASE_URL || 'http://34.74.6.124');
const ACREDITACION_ASIGNAR_FOLDER_API_BASE_URL = normalizeBaseUrl(
  process.env.ACREDITACION_ASIGNAR_FOLDER_API_BASE_URL || ACREDITACION_LEGACY_API_BASE_URL,
);
const ICSARA_API_BASE_URL =
  process.env.ICSARA_API_BASE_URL || 'http://34.74.6.124:8080';
const ICSARA_API_PREFIX =
  process.env.ICSARA_API_PREFIX || '/v1';
const ICSARA_API_KEY = process.env.ICSARA_API_KEY || '';
const parsedTimeoutMs = Number.parseInt(
  process.env.ACREDITACION_UPSTREAM_TIMEOUT_MS ?? '',
  10,
);
const UPSTREAM_TIMEOUT_MS = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0
  ? parsedTimeoutMs
  : 120000;

app.use(express.json({ limit: '300mb' }));
console.log(
  `[icsara] base=${ICSARA_API_BASE_URL} prefix=${ICSARA_API_PREFIX} apiKeyConfigured=${Boolean(ICSARA_API_KEY)}`,
);
console.log(
  `[acreditacion] legacyBase=${ACREDITACION_LEGACY_API_BASE_URL} asignarFolderBase=${ACREDITACION_ASIGNAR_FOLDER_API_BASE_URL}`,
);

const proxyLegacyAcreditacionPost = async (
  req,
  res,
  upstreamPath,
  { baseUrl = ACREDITACION_LEGACY_API_BASE_URL } = {},
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const endpoint = `${baseUrl}${upstreamPath}`;
  const requestStartedAt = Date.now();

  try {
    console.log(`[proxy] POST ${upstreamPath} -> ${endpoint}`);

    const upstreamResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
      signal: controller.signal,
    });

    const contentType = upstreamResponse.headers.get('content-type');
    const responseBody = await upstreamResponse.text();

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    res.status(upstreamResponse.status).send(responseBody);
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    console.error(`[proxy] Error calling ${endpoint}:`, error);
    res.status(502).json({
      error: 'Upstream API unavailable',
      endpoint: upstreamPath,
      timeout: isTimeout,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      elapsedMs: Date.now() - requestStartedAt,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const proxyIcsaraRequest = async (
  req,
  res,
  { upstreamPath, method = 'GET', streamBody = false },
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const endpoint = `${ICSARA_API_BASE_URL}${ICSARA_API_PREFIX}${upstreamPath}`;
  const requestStartedAt = Date.now();

  try {
    console.log(`[proxy] ${method} ${upstreamPath} -> ${endpoint}`);

    const headers = {};
    if (ICSARA_API_KEY) {
      headers['x-api-key'] = ICSARA_API_KEY;
    }

    if (streamBody) {
      if (req.headers['content-type']) {
        headers['content-type'] = req.headers['content-type'];
      }
      if (req.headers['content-length']) {
        headers['content-length'] = req.headers['content-length'];
      }
    } else if (method !== 'GET' && method !== 'HEAD') {
      headers['content-type'] = 'application/json';
    }

    const fetchOptions = {
      method,
      headers,
      signal: controller.signal,
    };

    if (streamBody) {
      fetchOptions.body = req;
      fetchOptions.duplex = 'half';
    } else if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body ?? {});
    }

    const upstreamResponse = await fetch(endpoint, fetchOptions);

    const contentType = upstreamResponse.headers.get('content-type');
    const contentDisposition = upstreamResponse.headers.get('content-disposition');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
    }

    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    res.status(upstreamResponse.status).send(responseBody);
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    console.error(`[proxy] Error calling ${endpoint}:`, error);
    res.status(502).json({
      error: 'Upstream API unavailable',
      endpoint: upstreamPath,
      timeout: isTimeout,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      elapsedMs: Date.now() - requestStartedAt,
    });
  } finally {
    clearTimeout(timeout);
  }
};

app.post('/api/acreditacion/carpetas/crear', async (req, res) => {
  await proxyLegacyAcreditacionPost(req, res, '/carpetas/crear');
});

app.post('/api/acreditacion/asignar-folder', async (req, res) => {
  await proxyLegacyAcreditacionPost(req, res, '/asignar-folder', {
    baseUrl: ACREDITACION_ASIGNAR_FOLDER_API_BASE_URL,
  });
});

app.post('/api/acreditacion/documentos/subir', async (req, res) => {
  await proxyLegacyAcreditacionPost(req, res, '/api/acreditacion/documentos/subir');
});

app.post('/api/acreditacion/adendas/jobs', (req, res) => {
  const endpoint = `${ICSARA_API_BASE_URL}${ICSARA_API_PREFIX}/jobs`;
  const target = new URL(endpoint);
  const client = target.protocol === 'https:' ? https : http;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  if (ICSARA_API_KEY) {
    headers['x-api-key'] = ICSARA_API_KEY;
  }

  const upstreamReq = client.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      method: 'POST',
      path: `${target.pathname}${target.search}`,
      headers,
    },
    (upstreamRes) => {
      if (upstreamRes.headers['content-type']) {
        res.setHeader('Content-Type', upstreamRes.headers['content-type']);
      }
      if (upstreamRes.headers['content-disposition']) {
        res.setHeader('Content-Disposition', upstreamRes.headers['content-disposition']);
      }
      res.status(upstreamRes.statusCode || 502);
      upstreamRes.pipe(res);
    },
  );

  upstreamReq.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    upstreamReq.destroy(new Error('Upstream timeout'));
  });

  upstreamReq.on('error', (error) => {
    console.error(`[proxy] Error calling ${endpoint}:`, error);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Upstream API unavailable', endpoint });
    }
  });

  req.pipe(upstreamReq);
});

app.get('/api/acreditacion/adendas/health/live', async (req, res) => {
  await proxyIcsaraRequest(req, res, {
    upstreamPath: '/health/live',
    method: 'GET',
  });
});

app.get('/api/acreditacion/adendas/debug/config', (req, res) => {
  res.json({
    base: ICSARA_API_BASE_URL,
    prefix: ICSARA_API_PREFIX,
    apiKeyConfigured: Boolean(ICSARA_API_KEY),
  });
});

app.get('/api/acreditacion/adendas/jobs/:jobId', async (req, res) => {
  await proxyIcsaraRequest(req, res, {
    upstreamPath: `/jobs/${encodeURIComponent(req.params.jobId)}`,
    method: 'GET',
  });
});

app.get('/api/acreditacion/adendas/jobs/:jobId/result', async (req, res) => {
  await proxyIcsaraRequest(req, res, {
    upstreamPath: `/jobs/${encodeURIComponent(req.params.jobId)}/result`,
    method: 'GET',
  });
});

app.get('/api/acreditacion/adendas/jobs/:jobId/preguntas_clasificadas', async (req, res) => {
  await proxyIcsaraRequest(req, res, {
    upstreamPath: `/jobs/${encodeURIComponent(req.params.jobId)}/result/preguntas_clasificadas.json`,
    method: 'GET',
  });
});

// Serve static files from the dist folder
app.use(express.static(join(__dirname, 'dist')));

// Serve index.html for all routes (React Router SPA)
app.get('*', (req, res) => {
  try {
    const indexPath = join(__dirname, 'dist', 'index.html');
    const indexContent = readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(indexContent);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
