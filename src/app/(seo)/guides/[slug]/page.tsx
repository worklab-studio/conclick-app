import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEntry, guideParams } from '@/content';
import { canonical, ogMeshUrl } from '@/lib/seo';
import { heroWordFor, meshKeyFor } from '@/lib/mesh/word';
import { ContentArticle } from '@/components/seo/ContentArticle';

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return guideParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = getEntry('guide', slug);
  if (!e) return {};
  const url = canonical(`/guides/${e.slug}`);
  const images = [e.ogImage || ogMeshUrl(meshKeyFor(e), heroWordFor(e))];
  return {
    title: e.metaTitle,
    description: e.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: e.metaTitle,
      description: e.metaDescription,
      siteName: 'Conclick',
      publishedTime: e.datePublished,
      modifiedTime: e.dateModified,
      images,
    },
    twitter: { card: 'summary_large_image', title: e.metaTitle, description: e.metaDescription, images },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = getEntry('guide', slug);
  if (!e) notFound();
  return <ContentArticle entry={e} />;
}
