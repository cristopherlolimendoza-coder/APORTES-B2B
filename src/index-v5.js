import base, { AportesDB } from './index.js';
export { AportesDB };

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const asset = await env.ASSETS.fetch(req);
      if (!asset.ok) return asset;
      const html = await asset.text();
      const script = '<script src="/editor-close-v5.js?v=20261027-closure-save-3"></script>';
      const body = html.includes(script) ? html : html.replace('</body>', script + '</body>');
      const headers = new Headers(asset.headers);
      headers.set('content-type', 'text/html; charset=utf-8');
      headers.set('cache-control', 'no-store, max-age=0');
      return new Response(body, { status: asset.status, headers });
    }
    return base.fetch(req, env, ctx);
  }
};
