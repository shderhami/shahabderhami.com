# shahabderhami.com

Personal academic site for Shahab Derhami, built as a static [Astro](https://astro.build)
site. It replaces a WordPress install and keeps every public URL the old site had,
including the original `/wp-content/uploads/...` paths for PDFs and images.

- Static output only, no client-side framework (about 800 bytes of inline JS for the
  theme toggle).
- Fonts are self-hosted via `@fontsource-variable`; nothing is requested from a
  third party at runtime.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:4321
```

Node 24 (see `.nvmrc`). With nvm: `nvm use`.

## Build

```bash
npm run build        # writes dist/
npm run preview      # serves dist/ at http://localhost:4321
npm run check-links  # verifies every internal link in dist/ resolves
```

`dist/` is what you deploy. Any static host works; no server-side runtime is needed.
Make sure the host serves directory-style URLs (`/about/` → `/about/index.html`),
which is the default nearly everywhere.

## Project layout

```
public/               static files copied verbatim into dist/
  wp-content/         the original WordPress media, at their original paths
  favicon.svg  robots.txt  og-card.jpg
scripts/
  import-wordpress.mjs  one-shot importer from the old WP REST API
  check-links.mjs       internal link checker for dist/
src/
  content/posts/*.md  one Markdown file per blog post
  data/*.json         publications, about page, taxonomies (generated)
  pages/              routes
  styles/global.css   the whole design system
```

## Add a new post

Create `src/content/posts/<slug>.md`. The `permalink` is the public URL and must
start and end with a slash — it is the single source of truth for the route.

```markdown
---
title: "A new result on lane depth"
date: "2026-03-14T10:00:00"
updated: "2026-03-14T10:00:00"
description: "One or two sentences. Used for the post list, meta description and RSS."
category:
  slug: "research"
  name: "Research"
tags:
  - name: "Lane depth"
    slug: "lane-depth"
permalink: "/research/a-new-result-on-lane-depth/"
---

Body text in Markdown. Raw HTML is allowed and passes through untouched.
```

A new **category** or **tag** also has to be listed in `src/data/taxonomies.json`
for its archive page (`/category/<slug>/`, `/tag/<slug>/`) to be generated.

### Images in posts

Put files under `public/` and link them with a root-absolute path. New images can
live anywhere sensible, for example `public/images/2026/chart.png` referenced as
`/images/2026/chart.png`. Existing posts point at `/wp-content/uploads/...` because
those paths must keep working.

Give every image explicit `width` and `height` so the page does not shift while it
loads. Figures with captions are plain HTML:

```html
<figure>
  <img src="/images/2026/chart.png" alt="What the chart shows" width="1600" height="900" loading="lazy" decoding="async">
  <figcaption>Figure 1. Caption text.</figcaption>
</figure>
```

Equation images rendered by QuickLaTeX use `<p class="equation">` with the LaTeX
source kept in the `alt` attribute; they get a light backing tile in dark mode so
the black glyphs stay readable.

## Update publications

Edit `src/data/publications.json`. It is an array of sections, each with a
`section` title and an `items` array:

```json
{
  "section": "Journals",
  "items": [
    {
      "title": "Paper title",
      "url": "https://doi.org/10.1016/j.example.2026.123456",
      "authors": "S. Derhami, & A. Coauthor",
      "venue": "Journal Name",
      "details": "12(3), 45-67, 2026",
      "doi": "10.1016/j.example.2026.123456",
      "year": 2026
    }
  ]
}
```

`S. Derhami` is bolded automatically wherever it appears in `authors`. `doi` renders
as a `doi.org` link; set it to `null` if there is none.

## CV

The CV was removed from the site on purpose: no links on any page, and the old
PDF files under `public/wp-content/uploads/` were deleted. To bring it back, put
the PDF under `public/`, add a `cv` object (`url`, `label`, `updated`) to
`src/data/about.json`, and add an entry for it to `PROFILES` in `src/consts.ts`.
Note that `npm run import` regenerates `about.json` and re-downloads the old CV
PDFs from WordPress, so re-apply the removal after running it.

## Re-run the WordPress import

Only needed if the old site is still up and something needs re-importing. It
overwrites `src/content/posts/*.md` and `src/data/*.json`, and downloads any media
that is not already in `public/` (existing files are left alone).

```bash
npm run import
```

It reads the public WP REST API — no login, no credentials. It prints a summary of
what it converted and warns about anything it could not fetch or clean up.
