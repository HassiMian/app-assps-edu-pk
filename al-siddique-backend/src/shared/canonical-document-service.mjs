/**
 * JARVIS 4.1 — CANONICAL DOCUMENT RENDERING SERVICE (Node.js / Headless Chrome)
 * 
 * Re-exports canonical visual templates and provides headless Chrome PDF generation.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

export * from './canonical-document-templates.mjs';
import { renderCanonicalAdmissionFormHtml, renderCanonicalFeeVoucherHtml } from './canonical-document-templates.mjs';

/**
 * Headless Chrome PDF Rendering Engine
 * Converts canonical HTML into print-ready A4 PDF
 */
export function findChromeExecutable() {
  const candidates = [
    '/root/chrome/linux-152.0.7977.75/chrome-linux64/chrome',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'google-chrome',
    'chromium',
    'chromium-browser'
  ];

  for (const c of candidates) {
    try {
      if (c.includes('/') && fs.existsSync(c)) return c;
    } catch {}
  }
  return 'google-chrome';
}

export function convertHtmlToPdf(html, outputPath, options = {}) {
  const isLandscape = options.landscape || false;
  const chromePath = findChromeExecutable();

  // Write temporary HTML file
  const tmpHtml = path.join(os.tmpdir(), `doc_${Date.now()}_${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmpHtml, html, 'utf8');

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  try {
    const args = [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--print-to-pdf=${outputPath}`,
      tmpHtml
    ];

    execFileSync(chromePath, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error(`PDF output file was not generated at: ${outputPath}`);
    }

    return {
      success: true,
      filePath: outputPath,
      fileSize: fs.statSync(outputPath).size,
      renderer: 'CANONICAL_HEADLESS_CHROME'
    };
  } finally {
    try { fs.unlinkSync(tmpHtml); } catch {}
  }
}

/**
 * Integrated Document Generation Methods
 */
export function renderAndSaveAdmissionForm(student, school, pdfPath, htmlPath = null) {
  const html = renderCanonicalAdmissionFormHtml(student, school);
  if (htmlPath) {
    const htmlDir = path.dirname(htmlPath);
    if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });
    fs.writeFileSync(htmlPath, html, 'utf8');
  }
  const pdfRes = convertHtmlToPdf(html, pdfPath, { landscape: false });
  return {
    ...pdfRes,
    htmlPath,
    html
  };
}

export function renderAndSaveFeeVoucher(challan, school, pdfPath, htmlPath = null, options = {}) {
  const html = renderCanonicalFeeVoucherHtml(challan, school, options);
  if (htmlPath) {
    const htmlDir = path.dirname(htmlPath);
    if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });
    fs.writeFileSync(htmlPath, html, 'utf8');
  }
  const pdfRes = convertHtmlToPdf(html, pdfPath, { landscape: true });
  return {
    ...pdfRes,
    htmlPath,
    html
  };
}
