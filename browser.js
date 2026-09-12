import dns from 'node:dns/promises';
import net from 'node:net';
import { chromium } from 'playwright';

const USER_AGENT = 'JarvisBot/1.0 (+voice assistant browsing tool)';
const NAV_TIMEOUT_MS = 15000;
const MAX_TEXT_LENGTH = 4000;
const MAX_SEARCH_RESULTS = 5;

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    });
  }
  return browserPromise;
}

function isPrivateIp(address) {
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    if (lower === '::1') return true;
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    return false;
  }
  return true; // unrecognized format, block to be safe
}

// Blocks navigation to non-http(s) schemes and to hosts that resolve to
// private/loopback/link-local addresses, to prevent this server-side
// browsing tool from being used to reach internal network services.
async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http:// and https:// URLs are allowed.');
  }

  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
    throw new Error('Local addresses are not allowed.');
  }

  let addresses;
  try {
    addresses = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new Error(`Could not resolve host: ${url.hostname}`);
  }

  if (addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error('Requests to private/internal addresses are not allowed.');
  }

  return url;
}

async function withPage(fn) {
  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await context.close();
  }
}

export async function openUrl(rawUrl) {
  const url = await assertPublicUrl(rawUrl);
  return withPage(async (page) => {
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    const title = await page.title();
    const text = await page.evaluate(() => document.body?.innerText || '');
    return {
      url: url.toString(),
      title,
      text: text.trim().slice(0, MAX_TEXT_LENGTH),
    };
  });
}

export async function searchWeb(query) {
  const searchUrl = new URL('https://duckduckgo.com/html/');
  searchUrl.searchParams.set('q', query);

  return withPage(async (page) => {
    await page.goto(searchUrl.toString(), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    const results = await page.evaluate((max) => {
      const items = Array.from(document.querySelectorAll('.result'));
      return items
        .map((el) => {
          const titleEl = el.querySelector('.result__a');
          const snippetEl = el.querySelector('.result__snippet');
          return {
            title: titleEl?.textContent?.trim() || '',
            url: titleEl?.href || '',
            snippet: snippetEl?.textContent?.trim() || '',
          };
        })
        .filter((r) => r.title && r.url)
        .slice(0, max);
    }, MAX_SEARCH_RESULTS);
    return results;
  });
}

export async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}
