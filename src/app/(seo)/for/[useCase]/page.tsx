import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEntry, useCaseParams } from '@/content';
import { canonical, ogImageUrl } from '@/lib/seo';
import { ContentArticle } from '@/components/seo/ContentArticle';

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return useCaseParams();
}

export async function generateMetadata({ params }: { params: Promise<{ useCase: string }> }): Promise<Metadata> {
  const { useCase } = await params;
  const e = getEntry('useCase', useCase);
  if (!e) return {};
  const url = canonical(`/for/${e.slug}`);
  const images = [e.ogImage || ogImageUrl(e.h1, 'Use case')];
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

export default async function Page({ params }: { params: Promise<{ useCase: string }> }) {
  const { useCase } = await params;
  const e = getEntry('useCase', useCase);
  if (!e) notFound();
  return <ContentArticle entry={e} />;
}
