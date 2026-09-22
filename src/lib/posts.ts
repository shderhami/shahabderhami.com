import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** All posts, newest first. */
export async function getSortedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Group posts by publication year, newest year first. */
export function groupByYear(posts: Post[]): Array<[number, Post[]]> {
  const years = new Map<number, Post[]>();
  for (const post of posts) {
    const y = post.data.date.getUTCFullYear();
    if (!years.has(y)) years.set(y, []);
    years.get(y)!.push(post);
  }
  return [...years.entries()].sort((a, b) => b[0] - a[0]);
}
