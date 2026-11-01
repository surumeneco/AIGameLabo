import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PAGES = Object.freeze([
  { path: '', title: '双路の砦', script: 'app.js', stylesheet: 'styles.css' },
  { path: 'beacon.html', title: '灯火の砦', script: 'beacon.js', stylesheet: 'beacon.css' },
  { path: 'island.html', title: 'こもれび島の開拓記', script: 'island.js', stylesheet: 'island.css' },
]);


function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
}

function stripInertContainers(html) {
  let cleaned = stripHtmlComments(html);
  for (const name of ['template', 'noscript']) {
    const pattern = new RegExp(String.raw\`<\\/?\${name}\\b(?:[^"'<>]|"[^"]*"|'[^']*')*>\`, 'gi');
    const spans = [];
    let depth = 0;
    let start = 0;
    for (const match of cleaned.matchAll(pattern)) {
      if (match[0].startsWith('</')) {
        if (depth > 0 && --depth === 0) spans.push([start, match.index + match[0].length]);
      } else if (depth++ === 0) {
        start = match.index;
      }
    }
    if (depth > 0) spans.push([start, cleaned.length]);
    for (let i = spans.length - 1; i >= 0; i--) {
      const [from, to] = spans[i];
      cleaned = cleaned.slice(0, from) + cleaned.slice(to);
    }
  }
  return cleaned;
}

function getTagAttribute(tag, attribute) {
  const opening = /^<[\w:-]+\b/.exec(tag);
  if (!opening) return null;
  let i = opening[0].length;
  while (i < tag.length) {
    while (/\s/.test(tag[i] ?? '')) i++;
    if (tag[i] === '>' || tag[i] === '/' || i >= tag.length) break;
    const start = i;
    while (i < tag.length && !/[\s=/>]/.test(tag[i])) i++;
    if (i === start) { i++; continue; }
    const key = tag.slice(start, i).toLowerCase();
    while (/\s/.test(tag[i] ?? '')) i++;
    let value = null;
    if (tag[i] === '=') {
      i++;
      while (/\s/.test(tag[i] ?? '')) i++;
      const quote = tag[i] === '"' || tag[i] === "'" ? tag[i++] : null;
      const valueStart = i;
      if (quote) {
        while (i < tag.length && tag[i] !== quote) i++;
        value = tag.slice(valueStart, i);
        if (i < tag.length) i++;
      } else {
        while (i < tag.length && !/[\s>]/.test(tag[i])) i++;
        value = tag.slice(valueStart, i);
      }
    }
    if (key === attribute.toLowerCase()) return value;
  }
  return null;
}

function hasActiveAssetTag(html, tagName, attribute, asset) {
  const withoutComments = stripInertContainers(html);
  const tags = withoutComments.match(new RegExp(String.raw`<${tagName}\b(?:[^"'<>]|"[^"]*"|'[^']*')*>`, 'gi')) ?? [];
  return tags.some(tag => {
    if (tagName === 'link') {
      const rel = getTagAttribute(tag, 'rel');
      if (!rel?.toLowerCase().split(/\s+/).includes('stylesheet')) return false;
    }
    if (tagName === 'script') {
      const type = getTagAttribute(tag, 'type');
      if (type !== null) {
        const essence = type.split(';', 1)[0].trim().toLowerCase();
        const executableTypes = [
          '', 'module', 'text/javascript', 'application/javascript',
          'application/x-javascript', 'text/ecmascript', 'application/ecmascript',
          'text/x-javascript', 'application/x-ecmascript',
        ];
        if (!executableTypes.includes(essence)) return false;
      }
    }
    return getTagAttribute(tag, attribute) === `./${asset}`;
  });
}

function hasActivePageTitle(html, title) {
  const withoutComments = stripInertContainers(html);
  const match = /<title(?:\s[^>]*)?>([\s\S]*?)<\/title\s*>/i.exec(withoutComments);
  return match?.[1].replace(/\s+/g, ' ').trim() === `${title} | AIGameLabo`;
}

function assertExpectedDocumentBase(html, pageUrl, assets) {
  const baseTags = stripInertContainers(html).match(/<base\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi) ?? [];
  const href = baseTags.map(tag => getTagAttribute(tag, 'href')).find(value => value !== null);
  if (href === undefined) return;
  try {
    const base = new URL(href, pageUrl);
    if (assets.some(asset => new URL(asset, base).href !== new URL(asset, pageUrl).href)) {
      throw new Error('asset location changed');
    }
  } catch {
    throw new Error(`${pageUrl}: unexpected document base ${href}`);
  }
}

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
    if (!hasActivePageTitle(html, page.title)) {
      throw new Error(`${url.href}: expected page title not found`);
    }
    assertExpectedDocumentBase(html, url.href, [page.script, page.stylesheet]);
    for (const [attribute, asset, expectedType] of [
      ['src', page.script, 'javascript'],
      ['href', page.stylesheet, 'text/css'],
    ]) {
      if (!hasActiveAssetTag(html, attribute === "src" ? "script" : "link", attribute, asset)) {
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
