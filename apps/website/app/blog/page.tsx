import type { Metadata } from 'next';
import Link from 'next/link';

import { getAllBlogPosts } from '@/lib/blog';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'goZaika Journal',
  description:
    'Research, restaurant economics, sustainability analysis, and market theses from the goZaika team.',
  ...canonical('/blog'),
  openGraph: openGraphFor(
    '/blog',
    'goZaika Journal',
    'Research, restaurant economics, sustainability analysis, and market theses from the goZaika team.',
  ),
  twitter: twitterFor(
    'goZaika Journal',
    'Research, restaurant economics, sustainability analysis, and market theses from the goZaika team.',
  ),
};

export default function BlogPage(): React.ReactElement {
  const posts = getAllBlogPosts();

  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
            goZaika Journal
          </p>
          <h1 className="heading-page mt-4 max-w-4xl text-gray900">
            Research and market intelligence for restaurant operators, investors, and thoughtful diners.
          </h1>
          <p className="text-lead mt-4 max-w-3xl text-gray700">
            Essays from the goZaika team on premium restaurant economics, category design,
            sustainability, and why city-first execution matters.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="rounded-3xl border border-gray100 bg-white p-8 shadow-[0_10px_30px_rgba(26,92,56,0.08)]"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray500">
                  <span>{post.publishedOn}</span>
                  <span aria-hidden="true">·</span>
                  <span>{post.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingTime}</span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-gray900">{post.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-gray700">{post.dek}</p>
                <p className="mt-4 text-sm leading-relaxed text-gray600">{post.heroSummary}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-saffron px-5 text-sm font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)]"
                >
                  Read article
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
