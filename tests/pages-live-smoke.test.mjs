import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLivePages, PAGES } from '../scripts/pages-live-smoke.mjs';

const baseUrl = 'https://example.github.io/AIGameLabo/';
function fixtures() {
  const data = new Map();
  for (const page of PAGES) {
    const pageUrl = new URL(page.path, baseUrl).href;
    data.set(pageUrl, { type: 'text/html', body: `<title>${page.title} | AIGameLabo</title><link href="./${page.stylesheet}"><script src="./${page.script}"></script>` });
    data.set(new URL(page.script, pageUrl).href, { type: 'application/javascript', body: 'console.log("a sufficiently long JavaScript asset");' });
    data.set(new URL(page.stylesheet, pageUrl).href, { type: 'text/css', body: '.app { display: grid; min-height: 100vh; }' });
  }
  return data;
}
function mockFetch(data) {
  return async url => {
    const entry = data.get(url);
    return entry
      ? new Response(entry.body, { status: 200, headers: { 'content-type': entry.type } })
      : new Response('Not Found', { status: 404, headers: { 'content-type': 'text/html' } });
  };
}

test('checks all three public routes and their JavaScript/CSS assets', async () => {
  const result = await checkLivePages({ baseUrl, fetchImpl: mockFetch(fixtures()) });
  assert.equal(result.length, 9);
  assert.ok(result.includes(baseUrl));
  assert.ok(result.includes(`${baseUrl}island.js`));
});

test('rejects a missing legacy route', async () => {
  const data = fixtures();
  data.delete(`${baseUrl}beacon.html`);
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /beacon\.html: HTTP 404/);
});

test('rejects a wrong page title even with HTTP 200', async () => {
  const data = fixtures();
  data.set(baseUrl, { type: 'text/html', body: '<title>Wrong game</title>' });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /expected page title not found/);
});

test('rejects an HTML fallback served instead of a JavaScript asset', async () => {
  const data = fixtures();
  data.set(`${baseUrl}app.js`, { type: 'text/html', body: '<html>Not Found</html>' });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /app\.js: expected javascript/);
});

test('rejects a missing stylesheet reference', async () => {
  const data = fixtures();
  data.set(baseUrl, { type: 'text/html', body: '<title>双路の砦 | AIGameLabo</title><script src="./app.js"></script>' });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing href="\.\/styles\.css"/);
});

test('rejects invalid base URLs before any network request', async () => {
  await assert.rejects(checkLivePages({ baseUrl: 'http://example.github.io/AIGameLabo/', fetchImpl: mockFetch(fixtures()) }), /HTTPS directory/);
  await assert.rejects(checkLivePages({ baseUrl: 'https://example.github.io/AIGameLabo', fetchImpl: mockFetch(fixtures()) }), /HTTPS directory/);
});

function mockFetchWithFinalUrl(data, redirect) {
  return async url => {
    const entry = data.get(url);
    const response = entry
      ? new Response(entry.body, { status: 200, headers: { 'content-type': entry.type } })
      : new Response('Not Found', { status: 404, headers: { 'content-type': 'text/html' } });
    Object.defineProperty(response, 'url', { value: redirect(url) });
    return response;
  };
}

test('rejects a cross-origin redirect even when the response looks valid', async () => {
  const fetchImpl = mockFetchWithFinalUrl(fixtures(), url =>
    url === baseUrl ? 'https://other.example/AIGameLabo/' : url
  );
  await assert.rejects(
    checkLivePages({ baseUrl, fetchImpl }),
    /unexpected final URL/
  );
});

test('rejects an asset redirect to the wrong path on the same origin', async () => {
  const fetchImpl = mockFetchWithFinalUrl(fixtures(), url =>
    url === `${baseUrl}app.js` ? `${baseUrl}island.js` : url
  );
  await assert.rejects(
    checkLivePages({ baseUrl, fetchImpl }),
    /unexpected final URL/
  );
});
