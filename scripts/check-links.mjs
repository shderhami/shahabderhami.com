#!/usr/bin/env node
/**
 * Walk every HTML file in dist/, pull out each internal href/src, and confirm
 * it resolves to a real file in dist/.
 *
 *   npm run build && node scripts/check-links.mjs
 *
 * Also flags anything still pointing at the old WordPress origin or at a
 * third-party font/CDN host, which this site must never do.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const FORBIDDEN_HOSTS = [
  'www.shahabderhami.com/wp-content',
  'shahabderhami.com/wp-content',
  'quicklatex.com/',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'googleapis',
  'gstatic',
];

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

/** Map a site-absolute URL path to the file dist/ would serve for it. */
function candidatesFor(urlPath) {
  const clean = decodeURI(urlPath.split(/[?#]/)[0]);
  const rel = clean.replace(/^\//, '');
  if (clean.endsWith('/')) return [path.join(DIST, rel, 'index.html')];
  return [
    path.join(DIST, rel),
    path.join(DIST, rel, 'index.html'),
    path.join(DIST, `${rel}.html`),
  ];
}

const ATTR_RE = /(?:href|src)\s*=\s*"([^"]*)"/gi;
const SRCSET_RE = /srcset\s*=\s*"([^"]*)"/gi;

async function main() {
  let files;
  try {
    files = await walk(DIST);
  } catch {
    console.error('dist/ not found - run `npm run build` first.');
    process.exit(1);
  }

  const distFiles = new Set(files.map((f) => f));
  const htmlFiles = files.filter((f) => f.endsWith('.html'));
  const xmlFiles = files.filter((f) => f.endsWith('.xml'));

  const broken = [];
  const forbidden = [];
  const anchors = [];
  let checked = 0;

  const exists = (p) => distFiles.has(p);

  for (const file of [...htmlFiles, ...xmlFiles]) {
    const html = await fs.readFile(file, 'utf8');
    const from = '/' + path.relative(DIST, file);

    for (const host of FORBIDDEN_HOSTS) {
      if (html.includes(host)) forbidden.push(`${from}: contains "${host}"`);
    }

    for (const m of html.matchAll(SRCSET_RE)) {
      broken.push(`${from}: unexpected srcset -> ${m[1].slice(0, 60)}`);
    }

    for (const m of html.matchAll(ATTR_RE)) {
      const raw = m[1].trim();
      if (!raw) continue;
      // external / protocol / in-page references are out of scope
      if (/^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(raw)) continue;
      if (!raw.startsWith('/')) {
        anchors.push(`${from}: relative link "${raw}"`);
        continue;
      }
      checked++;
      if (!candidatesFor(raw).some(exists)) broken.push(`${from} -> ${raw}`);
    }
  }

  console.log(`HTML/XML files scanned : ${htmlFiles.length + xmlFiles.length}`);
  console.log(`internal links checked : ${checked}`);
  console.log(`broken internal links  : ${broken.length}`);
  console.log(`forbidden host matches : ${forbidden.length}`);
  console.log(`relative links (info)  : ${anchors.length}`);

  for (const b of broken) console.log(`  BROKEN   ${b}`);
  for (const f of forbidden) console.log(`  FORBIDDEN ${f}`);
  for (const a of anchors) console.log(`  RELATIVE ${a}`);

  if (broken.length || forbidden.length) process.exit(1);
  console.log('\nAll internal links resolve.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
