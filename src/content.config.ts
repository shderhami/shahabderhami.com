import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    description: z.string().default(''),
    category: z.object({ slug: z.string(), name: z.string() }),
    tags: z
      .array(z.object({ name: z.string(), slug: z.string() }))
      .default([]),
    /** Exact path this post had on the old WordPress site. */
    permalink: z.string(),
    wordpressId: z.number().optional(),
  }),
});

export const collections = { posts };
