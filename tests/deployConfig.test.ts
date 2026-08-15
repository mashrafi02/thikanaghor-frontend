import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `vercel.json` must keep agreeing with the app it deploys.
 *
 * Every check here guards a failure that is silent in development and total in
 * production — dev never reads this file, so nothing below can be caught by running the
 * app locally:
 *
 *  • **The CSP script hash.** `index.html` carries one inline script, the pre-paint theme
 *    and language boot. A strict `script-src` allows it by hash, so editing that script
 *    without updating the hash means the browser refuses to run it — and since it is the
 *    first thing on the page, the result is a blank white screen with only a console
 *    message nobody is watching.
 *  • **The `/api` rewrite.** Without it the deployed app requests `/api/…` from Vercel,
 *    which answers with the SPA's `index.html`; every call then fails on parsing HTML as
 *    JSON. The relative base URL in `baseApi.ts` depends on this rewrite existing.
 *  • **The embed and thumbnail hosts.** A missing `frame-src` entry blocks a video; a
 *    missing `img-src` entry blanks its poster. Both fail quietly.
 */

const root = process.cwd();
const vercel = JSON.parse(readFileSync(path.resolve(root, 'vercel.json'), 'utf8')) as {
  rewrites: { source: string; destination: string }[];
  headers: { source: string; headers: { key: string; value: string }[] }[];
};

/** The single header block that applies to every path. */
function globalHeader(key: string): string {
  const block = vercel.headers.find((entry) => entry.source === '/(.*)');
  const header = block?.headers.find((h) => h.key === key);
  if (!header) throw new Error(`no ${key} header for /(.*) in vercel.json`);
  return header.value;
}

const csp = globalHeader('Content-Security-Policy');

describe('CSP allows the inline boot script', () => {
  it('lists the hash of the script actually in index.html', () => {
    const html = readFileSync(path.resolve(root, 'index.html'), 'utf8');
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
      (match) => match[1] ?? '',
    );

    // If a second inline script is ever added it needs its own hash, so the count is
    // asserted rather than just the first one matching.
    expect(inline).toHaveLength(1);

    const hash = createHash('sha256')
      .update(inline[0] ?? '')
      .digest('base64');
    expect(
      csp,
      `index.html's inline script changed — update the CSP hash in vercel.json to 'sha256-${hash}'`,
    ).toContain(`'sha256-${hash}'`);
  });

  it('does not fall back to unsafe-inline for scripts', () => {
    // The hash exists precisely so this is not needed; adding it would quietly undo the
    // protection while keeping the hash around to look reassuring.
    const scriptSrc = /script-src ([^;]+)/.exec(csp)?.[1] ?? '';
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });
});

describe('API rewrite', () => {
  it('forwards /api before the SPA catch-all', () => {
    const apiIndex = vercel.rewrites.findIndex((r) => r.source.startsWith('/api'));
    const catchAll = vercel.rewrites.findIndex((r) => r.source === '/(.*)');

    expect(apiIndex, 'no /api rewrite').toBeGreaterThanOrEqual(0);
    expect(catchAll, 'no SPA fallback').toBeGreaterThanOrEqual(0);
    // Order is the whole thing: after the catch-all, every API call returns index.html.
    expect(apiIndex).toBeLessThan(catchAll);
  });

  it('keeps the /api prefix when forwarding', () => {
    // The backend mounts its routes under /api, so stripping the prefix here 404s
    // everything.
    const api = vercel.rewrites.find((r) => r.source.startsWith('/api'));
    expect(api?.destination).toMatch(/\/api\/:path\*$/);
  });
});

describe('CSP hosts match what the app requests', () => {
  it('frames the three video providers', () => {
    for (const host of [
      'https://www.facebook.com',
      'https://www.tiktok.com',
      'https://www.youtube-nocookie.com',
    ]) {
      expect(/frame-src ([^;]+)/.exec(csp)?.[1] ?? '').toContain(host);
    }
  });

  it('allows the poster image hosts', () => {
    // YouTube posters come from ytimg, not from the domain the video is framed from —
    // the two lists are genuinely different.
    const imgSrc = /img-src ([^;]+)/.exec(csp)?.[1] ?? '';
    expect(imgSrc).toContain('https://i.ytimg.com');
    expect(imgSrc).toContain('tiktokcdn');
  });

  it('keeps connect-src same-origin, which the rewrite makes true', () => {
    // baseApi uses a relative /api URL, so requests never leave the origin. Widening this
    // would be a sign someone had reintroduced a cross-origin API base.
    expect(/connect-src ([^;]+)/.exec(csp)?.[1]?.trim()).toBe("'self'");
  });
});

describe('caching', () => {
  it('never lets the service worker be cached', () => {
    // A cached sw.js means a deploy that users never receive.
    const sw = vercel.headers.find((entry) => entry.source === '/sw.js');
    expect(sw?.headers[0]?.value).toContain('must-revalidate');
  });
});
