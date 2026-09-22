import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../consts';
import { getSortedPosts } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getSortedPosts();

  return rss({
    title: `${SITE.title} — Blog`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: post.data.permalink,
      categories: [
        post.data.category.name,
        ...post.data.tags.map((t) => t.name),
      ],
    })),
    customData: '<language>en-us</language>',
  });
}
