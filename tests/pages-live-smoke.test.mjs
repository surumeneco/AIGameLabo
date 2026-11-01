import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLivePages, PAGES } from '../scripts/pages-live-smoke.mjs';

const baseUrl = 'https://example.github.io/AIGameLabo/';
function fixtures() {
  const data = new Map();
  for (const page of PAGES) {
    const pageUrl = new URL(page.path, baseUrl).href;
    data.set(pageUrl, { type: 'text/html', body: `<title>${page.title} | AIGameLabo</title><link rel="stylesheet" href="./${page.stylesheet}"><script src="./${page.script}"></script>` });
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

test('accepts successful responses with canonical final URLs', async () => {
  const fetchImpl = mockFetchWithFinalUrl(fixtures(), url => url);
  const verified = await checkLivePages({ baseUrl, fetchImpl });
  assert.equal(verified.length, 9);
});


test('rejects JavaScript MIME lookalikes rather than substring matches', async () => {
  const data = fixtures();
  data.set(`${baseUrl}app.js`, {
    type: 'application/notjavascript',
    body: 'console.log("a sufficiently long JavaScript asset");',
  });
  await assert.rejects(
    checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }),
    /app\.js: expected javascript/
  );
});

test('rejects CSS MIME lookalikes rather than substring matches', async () => {
  const data = fixtures();
  data.set(`${baseUrl}styles.css`, {
    type: 'text/css-bogus',
    body: '.app { display: grid; min-height: 100vh; }',
  });
  await assert.rejects(
    checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }),
    /styles\.css: expected text\/css/
  );
});

test('accepts exact media types with case-insensitive parameters', async () => {
  const data = fixtures();
  const html = data.get(baseUrl);
  data.set(baseUrl, { ...html, type: 'TEXT/HTML; charset=UTF-8' });
  const js = data.get(`${baseUrl}app.js`);
  data.set(`${baseUrl}app.js`, { ...js, type: 'text/javascript; charset=utf-8' });
  const css = data.get(`${baseUrl}styles.css`);
  data.set(`${baseUrl}styles.css`, { ...css, type: 'text/css; charset=utf-8' });
  assert.equal((await checkLivePages({ baseUrl, fetchImpl: mockFetch(data) })).length, 9);
});

test('rejects asset references that exist only inside an HTML comment', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><!-- <link rel="stylesheet" href="./styles.css"><script src="./app.js"></script> -->',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing src="\.\/app\.js"/);
});

test('rejects asset attributes on unrelated HTML elements', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><div src="./app.js" href="./styles.css"></div>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing src="\.\/app\.js"/);
});

test('does not treat a preload link as an active stylesheet', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="preload" href="./styles.css"><script src="./app.js"></script>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing href="\.\/styles\.css"/);
});

test('accepts valid asset tags with single quotes and reordered attributes', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: "<title>双路の砦 | AIGameLabo</title><link href='./styles.css' media='screen' rel='stylesheet'><script defer src='./app.js'></script>",
  });
  assert.equal((await checkLivePages({ baseUrl, fetchImpl: mockFetch(data) })).length, 9);
});

test('rejects a page title that exists only in an HTML comment', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<!-- <title>双路の砦 | AIGameLabo</title> --><link rel="stylesheet" href="./styles.css"><script src="./app.js"></script>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /expected page title not found/);
});

test('accepts an active title element with attributes and whitespace', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title data-check="ok">  双路の砦 | AIGameLabo  </title><link rel="stylesheet" href="./styles.css"><script src="./app.js"></script>',
  });
  assert.equal((await checkLivePages({ baseUrl, fetchImpl: mockFetch(data) })).length, 9);
});

test('does not interpret a quoted data attribute as the script src attribute', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: `<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" href="./styles.css"><script data-note="hint src='./app.js'"></script>`,
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing src=/);
});

test('does not interpret a quoted data attribute as the stylesheet href attribute', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: `<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" data-note="hint href='./styles.css'"><script src="./app.js"></script>`,
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing href=/);
});

test('accepts a real script src after a greater-than sign inside a quoted attribute', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: `<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" href="./styles.css"><script data-note="x > y" src="./app.js"></script>`,
  });
  assert.equal((await checkLivePages({ baseUrl, fetchImpl: mockFetch(data) })).length, 9);
});

test('rejects a title that appears only after an unterminated HTML comment opener', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: `<!-- <title>双路の砦 | AIGameLabo</title><link rel="stylesheet" href="./styles.css"><script src="./app.js"></script>`,
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /expected page title not found/);
});

test('rejects asset tags that appear only inside an unterminated HTML comment', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: `<title>双路の砦 | AIGameLabo</title><!-- <link rel="stylesheet" href="./styles.css"><script src="./app.js"></script>`,
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing src=/);
});

test('accepts active asset tags following a properly closed HTML comment', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: `<!-- <title>wrong</title> --><title>双路の砦 | AIGameLabo</title><link rel="stylesheet" href="./styles.css"><script src="./app.js"></script>`,
  });
  assert.equal((await checkLivePages({ baseUrl, fetchImpl: mockFetch(data) })).length, 9);
});

test('rejects JSON data-block script even when its src names the game asset', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" href="./styles.css"><script type="application/json" src="./app.js"></script>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing src=/);
});

test('rejects importmap script as an executable game asset reference', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" href="./styles.css"><script type="importmap" src="./app.js"></script>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing src=/);
});

test('accepts an executable module script asset reference', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" href="./styles.css"><script type="module" src="./app.js"></script>',
  });
  assert.equal((await checkLivePages({ baseUrl, fetchImpl: mockFetch(data) })).length, 9);
});

test('rejects a document base element that redirects relative assets to another origin', async () => {
  const data = fixtures();
  const html = data.get(baseUrl);
  data.set(baseUrl, { ...html, body: html.body.replace('<title>', '<base href="https://other.example/"><title>') });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /unexpected document base/);
});

test('rejects a document base element that redirects assets to another directory', async () => {
  const data = fixtures();
  const html = data.get(baseUrl);
  data.set(baseUrl, { ...html, body: html.body.replace('<title>', '<base href="/wrong/"><title>') });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /unexpected document base/);
});

test('accepts a document base element resolving to the same public directory', async () => {
  const data = fixtures();
  const html = data.get(baseUrl);
  data.set(baseUrl, { ...html, body: html.body.replace('<title>', '<base href="./"><title>') });
  assert.equal((await checkLivePages({ baseUrl, fetchImpl: mockFetch(data) })).length, 9);
});

test('rejects script and stylesheet references found only in a template', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><template><script src="./app.js"></script><link rel="stylesheet" href="./styles.css"></template>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing src=/);
});

test('rejects script and stylesheet references found only in noscript', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><noscript><script src="./app.js"></script><link rel="stylesheet" href="./styles.css"></noscript>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing src=/);
});

test('rejects script references inside nested templates', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" href="./styles.css"><template><template><script src="./app.js"></script></template></template>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing src=/);
});

test('accepts active assets after a closed template', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><template><script src="./wrong.js"></script></template><link rel="stylesheet" href="./styles.css"><script src="./app.js"></script>',
  });
  assert.equal((await checkLivePages({ baseUrl, fetchImpl: mockFetch(data) })).length, 9);
});

test('rejects asset references after an unterminated template opener', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><template><script src="./app.js"></script><link rel="stylesheet" href="./styles.css">',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing src=/);
});


test('rejects a disabled stylesheet link as inactive for screen rendering', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" disabled href="./styles.css"><script src="./app.js"></script>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing href=/);
});

test('rejects a print-only stylesheet as inactive for screen rendering', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" media="print" href="./styles.css"><script src="./app.js"></script>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing href=/);
});

test('accepts an enabled screen stylesheet link', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" media="screen" href="./styles.css"><script src="./app.js"></script>',
  });
  assert.equal((await checkLivePages({ baseUrl, fetchImpl: mockFetch(data) })).length, 9);
});


test('rejects only-print media queries for the screen stylesheet', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" media="only print" href="./styles.css"><script src="./app.js"></script>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing href=/);
});

test('rejects print-and-feature media queries for the screen stylesheet', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" media="print and (color)" href="./styles.css"><script src="./app.js"></script>',
  });
  await assert.rejects(checkLivePages({ baseUrl, fetchImpl: mockFetch(data) }), /missing href=/);
});

test('accepts a stylesheet with both print and screen media queries', async () => {
  const data = fixtures();
  data.set(baseUrl, {
    type: 'text/html',
    body: '<title>双路の砦 | AIGameLabo</title><link rel="stylesheet" media="print, screen" href="./styles.css"><script src="./app.js"></script>',
  });
  assert.equal((await checkLivePages({ baseUrl, fetchImpl: mockFetch(data) })).length, 9);
});
