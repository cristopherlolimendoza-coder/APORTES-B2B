import base, { AportesDB } from './index-v9.js';
export { AportesDB };

const CANONICAL_NAME = 'Fiorella Zoe Canales Gomez';
const TARGET_RUCS = new Set(['20114803228', '20100318696']);

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function canonicalExecutive(value, ruc = '') {
  const cleanRuc = String(ruc || '').replace(/\D/g, '');
  const key = normalize(value);
  if (TARGET_RUCS.has(cleanRuc)) return CANONICAL_NAME;
  if (
    key === 'fiorella zoe canales gomez' ||
    key === 'fiorella zoe canales jean'
  ) return CANONICAL_NAME;
  return value;
}

function canonicalizeObject(value) {
  if (Array.isArray(value)) {
    value.forEach(canonicalizeObject);
    return value;
  }
  if (!value || typeof value !== 'object') return value;

  if (Object.prototype.hasOwnProperty.call(value, 'ejecutivo')) {
    value.ejecutivo = canonicalExecutive(value.ejecutivo, value.ruc);
  }
  for (const item of Object.values(value)) canonicalizeObject(item);
  return value;
}

async function rewriteJson(response) {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) return response;
  try {
    const data = canonicalizeObject(await response.clone().json());
    const headers = new Headers(response.headers);
    headers.set('content-type', 'application/json; charset=utf-8');
    headers.set('cache-control', 'no-store, max-age=0');
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch {
    return response;
  }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    let request = req;

    if (path === '/api/save' && req.method === 'PUT') {
      try {
        const body = await req.clone().json();
        canonicalizeObject(body);
        request = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(body)
        });
      } catch {}
    }

    let response = await base.fetch(request, env, ctx);

    if (['/api/data', '/api/save', '/api/history'].includes(path)) {
      response = await rewriteJson(response);
    }

    if (path === '/' || path === '/index.html') {
      const headers = new Headers(response.headers);
      headers.set('cache-control', 'no-store, max-age=0, must-revalidate');
      headers.set('pragma', 'no-cache');
      headers.set('expires', '0');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  }
};
