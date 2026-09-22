// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.shahabderhami.com',
  output: 'static',
  trailingSlash: 'always',
  // The post list is the home page; the old WordPress /blog/ page redirects to it.
  // (The old /feed/ address is forwarded by the static file public/feed/index.html,
  // because a redirect here would gain a trailing slash and point at /rss.xml/.)
  redirects: {
    '/blog/': '/',
  },
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.endsWith('/blog/'),
    }),
  ],
  markdown: {
    // Content comes from WordPress and already contains vetted inline HTML
    // (figures, galleries, QuickLaTeX equation images), which Astro passes
    // through untouched.
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
});
