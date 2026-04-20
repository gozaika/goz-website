import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAllBlogPosts, getBlogPostBySlug } from '@/lib/blog';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  return getAllBlogPosts().map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {};
  }

  const path = `/blog/${post.slug}`;

  return {
    title: `${post.title} | goZaika Journal`,
    description: post.dek,
    ...canonical(path),
    openGraph: openGraphFor(path, `${post.title} | goZaika Journal`, post.dek),
    twitter: twitterFor(`${post.title} | goZaika Journal`, post.dek),
  };
}

export default async function BlogPostPage({
  params,
}: BlogPostPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Link href="/blog" className="text-sm font-medium text-forest hover:text-gray900">
            Back to Journal
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-gray500">
            <span>{post.publishedOn}</span>
            <span aria-hidden="true">·</span>
            <span>{post.category}</span>
            <span aria-hidden="true">·</span>
            <span>{post.readingTime}</span>
          </div>
          <h1 className="heading-page mt-4 text-gray900">{post.title}</h1>
          <p className="text-lead mt-4 text-gray700">{post.dek}</p>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-gray600">
            {post.heroSummary}
          </p>
        </div>
      </section>

      <article className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="heading-section text-gray900">{section.heading}</h2>
                <div className="mt-5 space-y-4 text-base leading-relaxed text-gray700">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
    </>
  );
}
