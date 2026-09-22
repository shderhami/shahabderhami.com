#!/usr/bin/env node
/**
 * Import content from the legacy WordPress site at https://www.shahabderhami.com
 * into this Astro project.
 *
 *   node scripts/import-wordpress.mjs
 *
 * What it does
 *   1. Fetches posts / pages / categories / tags / media from the WP REST API.
 *   2. Downloads every media file plus every shahabderhami.com-hosted image
 *      referenced in content into public/, preserving the original URL path.
 *   3. Converts each post to Markdown in src/content/posts/<slug>.md.
 *   4. Extracts the About page and the Publications page into src/data/*.json.
 *   5. Prints a summary.
 *
 * Re-running is safe: already-downloaded files are skipped, Markdown/JSON is
 * regenerated from scratch.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const DATA_DIR = path.join(ROOT, 'src', 'data');

const ORIGIN = 'https://www.shahabderhami.com';
const API = `${ORIGIN}/wp-json/wp/v2`;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const warnings = [];
const warn = (msg) => {
  warnings.push(msg);
  console.warn(`  ! ${msg}`);
};

/* ------------------------------------------------------------------ utils */

async function getJSON(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const isLocalHost = (host) =>
  host === 'shahabderhami.com' || host === 'www.shahabderhami.com';

/** Absolute URL on the old site -> root-relative path (or null if external). */
function toLocalPath(href) {
  if (!href) return null;
  let u;
  try {
    u = new URL(href, ORIGIN);
  } catch {
    return null;
  }
  if (!isLocalHost(u.hostname)) return null;
  return decodeURI(u.pathname) + (u.search || '') + (u.hash || '');
}

/** Strip WordPress "-300x200" resize suffixes to get the original filename. */
function stripSizeSuffix(p) {
  return p.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '');
}

function decodeEntities(s) {
  return cheerio.load(`<x>${s ?? ''}</x>`, null, false)('x').text();
}

/** JSON is valid YAML 1.2, so JSON.stringify gives us safe scalars. */
function yamlValue(v) {
  return JSON.stringify(v);
}

function frontmatter(obj) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${k}: []`);
      } else if (typeof v[0] === 'object') {
        lines.push(`${k}:`);
        for (const item of v) {
          const entries = Object.entries(item);
          lines.push(`  - ${entries[0][0]}: ${yamlValue(entries[0][1])}`);
          for (const [ik, iv] of entries.slice(1)) {
            lines.push(`    ${ik}: ${yamlValue(iv)}`);
          }
        }
      } else {
        lines.push(`${k}:`);
        for (const item of v) lines.push(`  - ${yamlValue(item)}`);
      }
    } else if (typeof v === 'object') {
      lines.push(`${k}:`);
      for (const [ik, iv] of Object.entries(v)) {
        lines.push(`  ${ik}: ${yamlValue(iv)}`);
      }
    } else {
      lines.push(`${k}: ${yamlValue(v)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

const escAttr = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* --------------------------------------------------------------- download */

/** Local paths we must fetch from the old site. */
const downloadQueue = new Map(); // localPath -> absolute source URL

function queueDownload(localPath) {
  if (!localPath) return null;
  const clean = localPath.split(/[?#]/)[0];
  if (!clean.startsWith('/wp-content/')) return localPath;
  if (!downloadQueue.has(clean)) downloadQueue.set(clean, ORIGIN + encodeURI(clean));
  return localPath;
}

async function runDownloads() {
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;

  for (const [localPath, url] of downloadQueue) {
    const dest = path.join(PUBLIC_DIR, localPath.replace(/^\//, ''));
    if (await exists(dest)) {
      skipped++;
      continue;
    }
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, buf);
      downloaded++;
      bytes += buf.length;
    } catch (err) {
      failed++;
      warn(`download failed ${url}: ${err.message}`);
    }
  }
  return { downloaded, skipped, failed, bytes, total: downloadQueue.size };
}

/* ------------------------------------------------------------ HTML → clean */

/** media source_url pathname -> media item, for original-size lookups. */
let mediaByPath = new Map();

/**
 * Resolve an <img src> from the old site to the local path of the ORIGINAL
 * (non-resized) file, and return its known intrinsic dimensions.
 */
function resolveImage(src) {
  const local = toLocalPath(src);
  if (!local) return { src, external: true };

  const bare = local.split(/[?#]/)[0];
  const original = stripSizeSuffix(bare);

  // Prefer the original file when the media library confirms it exists.
  let finalPath = bare;
  if (original !== bare && mediaByPath.has(original)) finalPath = original;
  else if (mediaByPath.has(bare)) finalPath = bare;
  else if (original !== bare) finalPath = original; // best effort (e.g. ql-cache)

  queueDownload(finalPath);
  const item = mediaByPath.get(finalPath);
  return {
    src: finalPath,
    width: item?.media_details?.width,
    height: item?.media_details?.height,
  };
}

function imgHTML($, el, extra = '') {
  const $img = $(el);
  const resolved = resolveImage($img.attr('src'));
  const alt = $img.attr('alt') ?? '';
  const w = resolved.width ?? $img.attr('width');
  const h = resolved.height ?? $img.attr('height');
  const parts = [`src="${escAttr(resolved.src)}"`, `alt="${escAttr(alt)}"`];
  if (w) parts.push(`width="${escAttr(w)}"`);
  if (h) parts.push(`height="${escAttr(h)}"`);
  parts.push('loading="lazy"', 'decoding="async"');
  if (extra) parts.push(extra);
  return `<img ${parts.join(' ')} />`;
}

/** Inner HTML of a caption, with links rewritten, as a trimmed string. */
function captionHTML($, el) {
  const $c = $(el).clone();
  $c.find('a[href]').each((_, a) => {
    const local = toLocalPath($(a).attr('href'));
    if (local) $(a).attr('href', queueDownload(local));
    $(a).removeAttr('target').removeAttr('rel').removeAttr('class');
  });
  return $c.html()?.trim() ?? '';
}

/**
 * Normalise a post/page content fragment:
 *  - drop plugin share/comment markup and "more" markers
 *  - turn WP figures / galleries / captions / QuickLaTeX equations into small,
 *    clean HTML blocks that survive the Markdown conversion untouched
 *  - point every image and internal link at a local path
 */
function cleanFragment(html) {
  const $ = cheerio.load(html, null, false);

  // 1. plugin junk -------------------------------------------------------
  $(
    '.addtoany_share_save_container, .addtoany_content, .a2a_kit, .addtoany_list, ' +
      '.sharedaddy, .jp-relatedposts, #jp-post-flair, .post-comments, ' +
      '.sd-block, script, style, ins'
  ).remove();
  $('span[id^="more-"]').remove();
  $('*')
    .contents()
    .filter((_, n) => n.type === 'comment')
    .remove();

  // 2. QuickLaTeX displayed equations -----------------------------------
  $('p.ql-center-displayed-equation, p.ql-left-displayed-equation').each((_, p) => {
    const $p = $(p);
    const $img = $p.find('img').first();
    if (!$img.length) return;
    const eqnoText = $p
      .find('.ql-right-eqno, .ql-left-eqno')
      .text()
      .replace(/ /g, ' ')
      .trim();
    const img = imgHTML($, $img[0], 'class="equation-img"');
    const eqno = eqnoText ? `<span class="equation-number">${eqnoText}</span>` : '';
    $p.replaceWith(`<p class="equation">${img}${eqno}</p>`);
  });

  // inline QuickLaTeX images that are not inside an equation paragraph
  $('img.ql-img-inline-formula').each((_, el) => {
    $(el).replaceWith(imgHTML($, el, 'class="equation-inline"'));
  });

  // 3. galleries ---------------------------------------------------------
  $('figure.wp-block-gallery').each((_, g) => {
    const $g = $(g);
    const items = [];
    $g.find('li.blocks-gallery-item, figure.wp-block-image').each((__, li) => {
      const $img = $(li).find('img').first();
      if (!$img.length) return;
      const cap = captionHTML($, $(li).find('figcaption').first());
      items.push(
        `<figure class="gallery-item">${imgHTML($, $img[0])}` +
          (cap ? `<figcaption>${cap}</figcaption>` : '') +
          `</figure>`
      );
    });
    const cap = captionHTML($, $g.children('figcaption').first());
    if (!items.length) {
      $g.remove();
      return;
    }
    $g.replaceWith(
      `<figure class="gallery" data-columns="${items.length}">${items.join('')}` +
        (cap ? `<figcaption>${cap}</figcaption>` : '') +
        `</figure>`
    );
  });

  // 4. every remaining <figure> (WordPress uses wp-block-image, but also bare
  //    "aligncenter size-large is-resized" figures) ------------------------
  $('figure').each((_, f) => {
    const $f = $(f);
    // galleries were already normalised in step 3 - leave ours alone
    if ($f.is('.gallery, .gallery-item') || $f.parents('figure.gallery').length) return;
    const $img = $f.find('img').first();
    if (!$img.length) {
      $f.remove();
      return;
    }
    const cap = captionHTML($, $f.find('figcaption').first());
    $f.replaceWith(
      `<figure>${imgHTML($, $img[0])}` +
        (cap ? `<figcaption>${cap}</figcaption>` : '') +
        `</figure>`
    );
  });

  // 5. classic [caption] shortcodes -> <div class="wp-caption"> ----------
  $('div.wp-caption').each((_, d) => {
    const $d = $(d);
    const $img = $d.find('img').first();
    if (!$img.length) {
      $d.remove();
      return;
    }
    const cap = captionHTML($, $d.find('.wp-caption-text').first());
    $d.replaceWith(
      `<figure>${imgHTML($, $img[0])}` +
        (cap ? `<figcaption>${cap}</figcaption>` : '') +
        `</figure>`
    );
  });

  // 6. any remaining images -> plain figures, so that every content image
  //    keeps its intrinsic width/height and picks up the same styling ------
  $('img').each((_, el) => {
    const $el = $(el);
    if ($el.parents('figure').length || $el.parent().is('p.equation')) return;
    const $p = $el.parent();
    const replacement = `<figure>${imgHTML($, el)}</figure>`;
    // a paragraph holding nothing but the image becomes the figure itself
    if ($p.is('p') && $p.text().replace(/ /g, ' ').trim() === '') {
      $p.replaceWith(replacement);
    } else {
      $el.replaceWith(replacement);
    }
  });

  // 7. links -------------------------------------------------------------
  $('a[href]').each((_, a) => {
    const $a = $(a);
    const local = toLocalPath($a.attr('href'));
    if (local) $a.attr('href', queueDownload(local));
    $a.removeAttr('class').removeAttr('data-id').removeAttr('data-link');
    // keep target/rel only for external links
    if (local) $a.removeAttr('target').removeAttr('rel');
  });

  // 8. strip presentational leftovers, but keep the classes our own blocks
  //    rely on (they are what the stylesheet and the Markdown passthrough
  //    hook into) ----------------------------------------------------------
  const KEEP_CLASS = /^(equation|equation-number|gallery|gallery-item)$/;
  $('p, h1, h2, h3, h4, h5, h6, ul, ol, li, span, em, strong, div').each((_, el) => {
    const $el = $(el);
    if ($el.parents('figure, p.equation').length) return;
    const cls = ($el.attr('class') ?? '').trim();
    if (!KEEP_CLASS.test(cls)) $el.removeAttr('class');
    $el.removeAttr('style').removeAttr('id');
  });
  // unwrap spans that carry nothing
  $('span').each((_, el) => {
    const $el = $(el);
    if (!$el.attr('class') && !$el.attr('style')) $el.replaceWith($el.contents());
  });
  $('p').each((_, el) => {
    const $el = $(el);
    if (!$el.find('img').length && !$el.text().replace(/ /g, ' ').trim()) {
      $el.remove();
    }
  });

  const out = $.html();

  // Safety net: nothing may still point at the old site, and no WordPress
  // plumbing should survive into the Markdown.
  for (const pattern of [
    /https?:\/\/(?:www\.)?shahabderhami\.com/i,
    /\bsrcset=/i,
    /\bsizes=/i,
    /\bwp-(?:block|image|caption)\b/i,
    /quicklatex\.com\//i,
  ]) {
    const hit = out.match(pattern);
    if (hit) warn(`cleanFragment left "${hit[0]}" in the output - check the rules`);
  }

  return out;
}

/* ------------------------------------------------------------- Turndown */

function makeTurndown() {
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });

  // keep inline semantics Markdown has no syntax for
  td.keep(['sup', 'sub']);

  // pass our cleaned block-level HTML straight through
  td.addRule('rawBlocks', {
    filter: (node) =>
      node.nodeName === 'FIGURE' ||
      (node.nodeName === 'P' && node.getAttribute?.('class') === 'equation'),
    replacement: (_content, node) => `\n\n${node.outerHTML}\n\n`,
  });

  // standalone <img> outside a figure -> Markdown image, keeping alt
  td.addRule('image', {
    filter: 'img',
    replacement: (_c, node) => {
      const alt = node.getAttribute('alt') || '';
      const src = node.getAttribute('src') || '';
      return src ? `![${alt}](${src})` : '';
    },
  });

  return td;
}

function htmlToMarkdown(td, html) {
  return td
    .turndown(html)
    .replace(/ /g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ------------------------------------------------------------- excerpts */

function excerptToDescription(html) {
  const raw = html ?? '';
  const $ = cheerio.load(raw, null, false);
  $('a.more-link, .more-link, span.screen-reader-text').remove();
  const text = $.root().text();
  const cleaned = text
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*(?:…|\.\.\.)?\s*Continue reading\s*.*$/i, '')
    .replace(/\s*\[[^\]]*\]\s*$/, '')
    .replace(/[\s…]+$/, '')
    .trim();

  // WordPress auto-excerpts are cut at ~55 words; keep the ellipsis so the
  // description does not read as a sentence that simply stops.
  const truncated = /more-link|…|&hellip;|\.\.\./i.test(raw);
  if (!cleaned) return cleaned;
  return truncated && !/[.!?]$/.test(cleaned) ? `${cleaned}…` : cleaned;
}

/* --------------------------------------------------------- publications */

function parsePublications(html) {
  const $ = cheerio.load(html, null, false);
  const sections = [];
  let current = null;

  $.root()
    .children()
    .each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      if (/^h[1-6]$/.test(tag ?? '')) {
        current = { section: $(el).text().trim(), items: [] };
        sections.push(current);
        return;
      }
      if (tag !== 'ol' && tag !== 'ul') return;
      if (!current) {
        current = { section: 'Publications', items: [] };
        sections.push(current);
      }
      $(el)
        .children('li')
        .each((__, li) => {
          const item = parsePublicationItem($, li);
          if (item) current.items.push(item);
        });
    });

  return sections.filter((s) => s.items.length);
}

function parsePublicationItem($, li) {
  const $li = $(li);
  const $a = $li.find('a[href]').first();
  const url = $a.attr('href')?.trim() || null;
  const title = $a.length ? $a.text().trim() : null;

  // The entries are laid out as three <br>-separated lines:
  //   title link / authors / venue + volume-pages-year (or DOI)
  const chunks = ($li.html() ?? '')
    .split(/<br\s*\/?>/i)
    .map((c) => cheerio.load(`<div>${c}</div>`, null, false)('div'));

  const textOf = ($c) =>
    $c
      .text()
      .replace(/ /g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const clean = (s) =>
    s
      // the source HTML has a few run-together separators ("S. Derhami,& B.")
      .replace(/,(?=\S)/g, ', ')
      .replace(/\s*&\s*/g, ' & ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,;.]+/, '')
      .replace(/[\s,;]+$/, '')
      .trim();

  let authors = '';
  let venue = '';
  let details = '';

  if (chunks.length >= 3) {
    authors = clean(textOf(chunks[1]));
    const $venueChunk = chunks[2];
    const $em = $venueChunk.find('em').first();
    venue = $em.length ? clean(textOf($em)) : '';
    if ($em.length) $em.remove();
    details = clean(textOf($venueChunk));
  } else {
    // Fallback: derive from the whole <li>.
    const $strong = $li.find('strong').first();
    authors = clean($strong.parent().text().trim());
    const $em = $li.find('em').first();
    venue = $em.length ? clean(textOf($em)) : '';
  }

  if (!title && !authors) return null;

  // Pull a DOI out of the details or the URL when present.
  let doi = null;
  const doiInDetails = details.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  if (doiInDetails) doi = doiInDetails[0].replace(/[.,;]$/, '');
  else if (url) {
    const m = url.match(/(?:doi\.org\/|doi\/full\/|dx\.doi\.org\/)(10\.[^?#]+)/i);
    if (m) doi = m[1].replace(/[.,;]$/, '');
  }

  // Year is the last 4-digit number in the details line. One source entry
  // italicises the year together with the venue ("Progress in ..., 2016"),
  // so pull it back out of the venue when the details line has none.
  let years = details.match(/\b(19|20)\d{2}\b/g);
  let year = years ? Number(years[years.length - 1]) : null;
  if (!year) {
    const inVenue = venue.match(/,\s*((?:19|20)\d{2})\s*$/);
    if (inVenue) {
      year = Number(inVenue[1]);
      venue = venue.replace(/,\s*(?:19|20)\d{2}\s*$/, '').trim();
      details = details || String(year);
    }
  }

  // Drop a redundant "DOI: x" from details when we surface the DOI separately.
  const detailsClean = clean(details.replace(/,?\s*DOI:\s*10\.[^\s,]+/i, ''));

  return {
    title: title ? decodeEntities(title) : null,
    url,
    authors: decodeEntities(authors),
    venue: decodeEntities(venue),
    details: decodeEntities(detailsClean),
    doi,
    year,
  };
}

/* ---------------------------------------------------------------- about */

function parseAbout(html) {
  const $ = cheerio.load(html, null, false);

  // headshot
  let headshot = null;
  const $img = $('img').first();
  if ($img.length) {
    const resolved = resolveImage($img.attr('src'));
    headshot = {
      src: resolved.src,
      alt: $img.attr('alt') || 'Shahab Derhami',
      width: resolved.width ?? Number($img.attr('width')) ?? null,
      height: resolved.height ?? Number($img.attr('height')) ?? null,
    };
    $img.remove();
  }

  // bio = the first paragraph with real prose, links preserved
  const paragraphs = [];
  $('p').each((_, p) => {
    const $p = $(p);
    $p.find('a[href]').each((__, a) => {
      $(a).removeAttr('target').removeAttr('rel').removeAttr('class');
    });
    const text = $p.text().replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    const html = ($p.html() ?? '')
      .replace(/&nbsp;/g, ' ')
      .replace(/ /g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    if (text) paragraphs.push({ text, html });
  });

  const bio = paragraphs.find((p) => p.text.length > 120) ?? paragraphs[0] ?? null;

  let cv = null;
  let scholar = null;
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    const label = $(a).text().trim();
    if (/\.pdf($|[?#])/i.test(href) && !cv) {
      const local = toLocalPath(href);
      if (local) queueDownload(local);
      const around = $(a).parent().text().replace(/\s+/g, ' ').trim();
      const updated = around.match(/updated on ([0-9/.-]+)/i)?.[1] ?? null;
      cv = { url: local ?? href, label: label || 'Curriculum Vitae', updated };
    }
    if (/scholar\.google\./i.test(href) && !scholar) scholar = decodeEntities(href);
  });

  return {
    bioHTML: bio?.html ?? '',
    bioText: bio?.text ?? '',
    headshot,
    cv,
    scholar,
  };
}

async function fetchSocialLinks() {
  try {
    const res = await fetch(ORIGIN, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const html = await res.text();
    const find = (re) => html.match(re)?.[0] ?? null;
    return {
      twitter: find(/https?:\/\/(?:www\.)?twitter\.com\/[A-Za-z0-9_]+/),
      linkedin: find(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/),
    };
  } catch (err) {
    warn(`could not read social links from the homepage: ${err.message}`);
    return { twitter: null, linkedin: null };
  }
}

/* ------------------------------------------------------------------ main */

async function main() {
  console.log(`Importing from ${ORIGIN}\n`);

  console.log('Fetching REST API ...');
  const [posts, pages, categories, tags, media] = await Promise.all([
    getJSON(`${API}/posts?per_page=100&status=publish`),
    getJSON(`${API}/pages?per_page=100&status=publish`),
    getJSON(`${API}/categories?per_page=100`),
    getJSON(`${API}/tags?per_page=100`),
    getJSON(`${API}/media?per_page=100`),
  ]);
  console.log(
    `  posts=${posts.length} pages=${pages.length} categories=${categories.length} ` +
      `tags=${tags.length} media=${media.length}`
  );

  // index media by original path, and queue every media file for download
  mediaByPath = new Map();
  for (const m of media) {
    const local = toLocalPath(m.source_url);
    if (!local) {
      warn(`media ${m.id} has an off-site source_url: ${m.source_url}`);
      continue;
    }
    mediaByPath.set(local, m);
    queueDownload(local);
  }
  const mediaQueued = downloadQueue.size;

  const catById = new Map(categories.map((c) => [c.id, c]));
  const tagById = new Map(tags.map((t) => [t.id, t]));

  // ----------------------------------------------------------- posts ----
  await fs.mkdir(POSTS_DIR, { recursive: true });
  for (const f of await fs.readdir(POSTS_DIR).catch(() => [])) {
    if (f.endsWith('.md')) await fs.unlink(path.join(POSTS_DIR, f));
  }

  const td = makeTurndown();
  const written = [];

  for (const post of posts) {
    const cleaned = cleanFragment(post.content.rendered);
    const markdown = htmlToMarkdown(td, cleaned);

    const cat = catById.get(post.categories?.[0]);
    const postTags = (post.tags ?? [])
      .map((id) => tagById.get(id))
      .filter(Boolean)
      .map((t) => ({ name: decodeEntities(t.name), slug: t.slug }));

    const permalink = toLocalPath(post.link) ?? `/${cat?.slug ?? 'blog'}/${post.slug}/`;

    const fm = frontmatter({
      title: decodeEntities(post.title.rendered),
      date: post.date,
      updated: post.modified,
      description: excerptToDescription(post.excerpt?.rendered),
      category: cat
        ? { slug: cat.slug, name: decodeEntities(cat.name) }
        : { slug: 'uncategorized', name: 'Uncategorized' },
      tags: postTags,
      permalink,
      wordpressId: post.id,
    });

    const file = path.join(POSTS_DIR, `${post.slug}.md`);
    await fs.writeFile(file, `${fm}\n\n${markdown}\n`);
    written.push({ slug: post.slug, permalink, bytes: markdown.length });
  }

  // ----------------------------------------------------------- pages ----
  await fs.mkdir(DATA_DIR, { recursive: true });

  const pubPage = pages.find((p) => p.slug === 'publications');
  let publications = [];
  if (pubPage) {
    publications = parsePublications(pubPage.content.rendered);
    await fs.writeFile(
      path.join(DATA_DIR, 'publications.json'),
      JSON.stringify(publications, null, 2) + '\n'
    );
  } else {
    warn('publications page not found');
  }

  const aboutPage = pages.find((p) => p.slug === 'about');
  let about = null;
  if (aboutPage) {
    about = parseAbout(aboutPage.content.rendered);
    about.title = decodeEntities(aboutPage.title.rendered);
    about.updated = aboutPage.modified;
    about.social = await fetchSocialLinks();
    await fs.writeFile(
      path.join(DATA_DIR, 'about.json'),
      JSON.stringify(about, null, 2) + '\n'
    );
  } else {
    warn('about page not found');
  }

  // taxonomies actually in use (so the site only builds real archive pages)
  const usedCats = new Set(posts.flatMap((p) => p.categories ?? []));
  const usedTags = new Set(posts.flatMap((p) => p.tags ?? []));
  await fs.writeFile(
    path.join(DATA_DIR, 'taxonomies.json'),
    JSON.stringify(
      {
        categories: categories
          .filter((c) => usedCats.has(c.id))
          .map((c) => ({ slug: c.slug, name: decodeEntities(c.name) })),
        tags: tags
          .filter((t) => usedTags.has(t.id))
          .map((t) => ({ slug: t.slug, name: decodeEntities(t.name) })),
      },
      null,
      2
    ) + '\n'
  );

  // -------------------------------------------------------- downloads ---
  console.log(`\nDownloading ${downloadQueue.size} files into public/ ...`);
  const dl = await runDownloads();

  // Social cards need an absolute URL, and every page carries one. Serving it
  // from /og-card.jpg keeps the only absolute asset URLs in the built HTML off
  // the /wp-content/ paths, which stay reserved for the original files.
  let ogCard = false;
  if (about?.headshot?.src) {
    const source = path.join(PUBLIC_DIR, about.headshot.src.replace(/^\//, ''));
    const dest = path.join(PUBLIC_DIR, 'og-card.jpg');
    try {
      await fs.copyFile(source, dest);
      ogCard = true;
    } catch (err) {
      warn(`could not create og-card.jpg: ${err.message}`);
    }
  }

  // ---------------------------------------------------------- summary ---
  console.log('\n--- import summary ---------------------------------------');
  console.log(`posts converted      : ${written.length}`);
  for (const w of written) {
    console.log(`  ${w.permalink}  (${w.bytes} chars of Markdown)`);
  }
  console.log(`publication sections : ${publications.length}` +
    ` (${publications.reduce((n, s) => n + s.items.length, 0)} entries)`);
  for (const s of publications) console.log(`  ${s.section}: ${s.items.length}`);
  console.log(`about page           : ${about ? 'imported' : 'MISSING'}`);
  if (about) {
    console.log(`  headshot : ${about.headshot?.src ?? 'none'}`);
    console.log(`  cv       : ${about.cv?.url ?? 'none'}`);
    console.log(`  scholar  : ${about.scholar ?? 'none'}`);
    console.log(`  twitter  : ${about.social?.twitter ?? 'none'}`);
    console.log(`  linkedin : ${about.social?.linkedin ?? 'none'}`);
  }
  console.log(
    `files                : ${dl.total} referenced ` +
      `(${mediaQueued} from the media library, ${dl.total - mediaQueued} extra in-content)`
  );
  console.log(
    `  downloaded ${dl.downloaded} (${(dl.bytes / 1024 / 1024).toFixed(2)} MB), ` +
      `already present ${dl.skipped}, failed ${dl.failed}`
  );
  console.log(`social card          : ${ogCard ? '/og-card.jpg' : 'NOT CREATED'}`);
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  - ${w}`);
  } else {
    console.log('\nNo problems reported.');
  }
  console.log('----------------------------------------------------------');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
