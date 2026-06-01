/**
 * Shared headless-Chrome instance for PDF rendering.
 *
 * One browser is launched lazily and reused for every document (cheap, handles
 * thousands of PDFs/day). We use puppeteer-core pointed at a system Chrome so no
 * Chromium download is needed. Override the binary with PUPPETEER_EXECUTABLE_PATH.
 */
import puppeteer, { type Browser } from 'puppeteer-core';

const CANDIDATE_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  // Linux (containers / servers)
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean) as string[];

function resolveExecutable(): string {
  const fs = require('node:fs') as typeof import('node:fs');
  for (const p of CANDIDATE_PATHS) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  throw new Error(
    'No Chrome/Chromium binary found for PDF generation. Set PUPPETEER_EXECUTABLE_PATH.',
  );
}

let browserPromise: Promise<Browser> | null = null;

async function launch(): Promise<Browser> {
  const browser = await puppeteer.launch({
    executablePath: resolveExecutable(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  // If Chrome dies, drop the cached promise so the next call relaunches.
  browser.on('disconnected', () => {
    browserPromise = null;
  });
  return browser;
}

export function getBrowser(): Promise<Browser> {
  if (!browserPromise) browserPromise = launch().catch((e) => {
    browserPromise = null;
    throw e;
  });
  return browserPromise;
}

/** Render a full HTML string to an A4 PDF buffer. */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    browserPromise = null;
    if (b) await b.close().catch(() => undefined);
  }
}
