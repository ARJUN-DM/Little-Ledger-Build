/**
 * Static-asset Worker for Little Ledger.
 * Serves the files in ../little-ledger and makes sure the app shell and the
 * service worker are always revalidated so updates reach installed copies.
 */
const NO_CACHE = new Set(['/', '/index.html', '/sw.js']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const asset = await env.ASSETS.fetch(request);

    if (asset.status === 204 || asset.status === 304) return asset;

    const headers = new Headers(asset.headers);
    // Marks responses that actually came through this Worker, not straight off the asset layer.
    headers.set('x-ledger-worker', '1');

    if (NO_CACHE.has(url.pathname)) {
      headers.set('cache-control', 'no-cache');
    }

    if (url.pathname.endsWith('.webmanifest')) {
      headers.set('content-type', 'application/manifest+json; charset=utf-8');
    }

    return new Response(asset.body, {
      status: asset.status,
      statusText: asset.statusText,
      headers,
    });
  },
};
