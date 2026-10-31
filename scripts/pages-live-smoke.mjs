import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PAGES = Object.freeze([
  { path: '', title: '双路の砦', script: 'app.js', stylesheet: 'styles.css' },
  { path: 'beacon.html', title: '灯火の砦', script: 'beacon.js', stylesheet: 'beacon.css' },
  { path: 'island.html', title: 'こもれび島の開拓記', script: 'island.js', stylesheet: 'island.css' },
]);

async function fetchText(fetchImpl, url, expectedType) {
  const response = await fetchImpl(url, {
    redirect: 'follow',
    headers: { 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  if (response.url && new URL(response.url).href !== new URL(url).href) {
    throw new Error(`${url}: unexpected final URL ${response.url}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
  const allowedMediaTypes = expectedType === 'javascript'
    ? ['text/javascript', 'application/javascript', 'application/x-javascript']
    : [expectedType];
  if (!allowedMediaTypes.includes(mediaType)) {
    throw new Error(`${url}: expected ${expectedType}, got ${contentType || '(missing content-type)'}`);
  }
  const body = await response.text();
  if (!body.trim()) throw new Error(`${url}: empty response`);
  return body;
}

export async function checkLivePages({
  baseUrl = 'https://surumeneco.github.io/AIGameLabo/',
  fetchImpl = fetch,
} = {}) {
  const root = new URL(baseUrl);
  if (root.protocol !== 'https:' || !root.pathname.endsWith('/')) {
    throw new Error('baseUrl must be an HTTPS directory URL ending in /');
  }
  const verified = [];
  for (const page of PAGES) {
    const url = new URL(page.path, root);
    const html = await fetchText(fetchImpl, url.href, 'text/html');
    if (!html.includes(`<title>${page.title} | AIGameLabo</title>`)) {
      throw new Error(`${url.href}: expected page title not found`);
    }
    for (const [attribute, asset, expectedType] of [
      ['src', page.script, 'javascript'],
      ['href', page.stylesheet, 'text/css'],
    ]) {
      if (!html.includes(`${attribute}="./${asset}"`)) {
        throw new Error(`${url.href}: missing ${attribute}="./${asset}"`);
      }
      const assetUrl = new URL(asset, url);
      const assetBody = await fetchText(fetchImpl, assetUrl.href, expectedType);
      if (assetBody.length < 32) throw new Error(`${assetUrl.href}: suspiciously short asset`);
      verified.push(assetUrl.href);
    }
    verified.push(url.href);
  }
  return verified;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const urls = await checkLivePages();
    console.log(`Verified ${PAGES.length} live pages and ${urls.length - PAGES.length} assets:`);
    for (const url of urls) console.log(`  ${url}`);
  } catch (error) {
    console.error(`Pages HTTP smoke failed: ${error.message}`);
    process.exitCode = 1;
  }
}
