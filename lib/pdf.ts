// lib/pdf.ts
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import chromium from '@sparticuz/chromium';
import puppeteer, { type HTTPRequest } from 'puppeteer-core';

// Turns the comparison report into a real PDF with headless Chromium, as the IM
// and GI tools do. Advisors used to download the report as HTML and print it to
// PDF themselves; the server now does it, so the same file can be filed in the
// enquiry's WorkDrive. Server-only.

// The only network the page may use. The report inlines its artwork, font and
// insurer logos as data: URIs; the NSIB logo and mascot are the exception.
// Everything else is refused, so the server's browser can't be pointed at
// internal URLs by whatever HTML it is handed.
const ALLOWED_HOSTS = new Set(['i.imgur.com']);

// Page 2's tables are set in Arial and their column widths are tuned to it, but
// Vercel's Linux servers have no Arial. Arimo has Arial's exact metrics, so it
// is installed under Arial's names and the layout comes out as it does on an
// advisor's machine. Noto Sans Arabic joins the same families for its own
// characters only, for customer names written in Arabic.
const FONT_FACES: { file: string; weight: number; unicodeRange?: string }[] = [
  { file: '@fontsource/arimo/files/arimo-latin-400-normal.woff2', weight: 400 },
  { file: '@fontsource/arimo/files/arimo-latin-700-normal.woff2', weight: 700 },
  { file: '@fontsource/arimo/files/arimo-latin-ext-400-normal.woff2', weight: 400, unicodeRange: 'U+0100-024F,U+1E00-1EFF' },
  { file: '@fontsource/arimo/files/arimo-latin-ext-700-normal.woff2', weight: 700, unicodeRange: 'U+0100-024F,U+1E00-1EFF' },
  { file: '@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff2', weight: 400, unicodeRange: 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF' },
  { file: '@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-700-normal.woff2', weight: 700, unicodeRange: 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF' },
];
const FONT_FAMILIES = ['Arial', 'Helvetica', 'Arial Black', 'Arial Bold'];

let fontCss: Promise<string> | null = null;

// Built once per warm instance: the font files never change.
function loadFontCss(): Promise<string> {
  fontCss ??= Promise.all(
    FONT_FACES.map(async ({ file, weight, unicodeRange }) => {
      const data = await fs.readFile(path.join(process.cwd(), 'node_modules', file));
      const src = `url(data:font/woff2;base64,${data.toString('base64')}) format('woff2')`;
      const range = unicodeRange ? ` unicode-range: ${unicodeRange};` : '';
      return FONT_FAMILIES.map(
        (family) => `@font-face { font-family: '${family}'; font-weight: ${weight}; src: ${src};${range} }`
      ).join('\n');
    })
  )
    .then((faces) => faces.join('\n'))
    .catch((error) => {
      fontCss = null; // try again next time rather than caching the failure
      throw error;
    });
  return fontCss;
}

export async function renderPdf(html: string): Promise<Buffer> {
  // @sparticuz/chromium is a Linux build for Vercel. Anywhere else — a
  // developer's Windows machine running `npm run dev` — use the installed browser.
  const onVercelLinux = process.platform === 'linux';
  const [fonts, browser] = await Promise.all([
    loadFontCss(),
    puppeteer.launch({
      args: onVercelLinux ? chromium.args : [],
      executablePath: onVercelLinux ? await chromium.executablePath() : localBrowserPath(),
      headless: true,
    }),
  ]);

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      void answer(request).catch(() => request.abort().catch(() => {}));
    });

    // Placed first so the report's own styles still win wherever they differ.
    const withFonts = html.replace(/<head>/i, `<head><style>${fonts}</style>`);
    // Waits for the logos; without it the first render can go to PDF before
    // they arrive.
    await page.setContent(withFonts, { waitUntil: 'load', timeout: 30000 });
    await page.waitForNetworkIdle({ idleTime: 300, timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    // The report sets its own A4 pages with no margin, as it does when an
    // advisor prints the HTML.
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    return Buffer.from(pdf);
  } finally {
    // Leaving a browser open leaks the whole serverless instance's memory.
    await browser.close().catch(() => {});
  }
}

async function answer(request: HTTPRequest) {
  const url = new URL(request.url());
  if (url.protocol === 'data:' || url.protocol === 'about:') return request.continue();
  if (url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname)) return request.continue();
  return request.abort();
}

// Chrome or Edge for local development; CHROME_PATH overrides when it lives elsewhere.
function localBrowserPath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find((p) => existsSync(p)) || candidates[0];
}
