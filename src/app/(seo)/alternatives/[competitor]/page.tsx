import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEntry, alternativeParams } from '@/content';
import { canonical, ogImageUrl } from '@/lib/seo';
import { ContentArticle } from '@/components/seo/ContentArticle';

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return alternativeParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const e = getEntry('alternative', competitor);
  if (!e) return {};
  const url = canonical(`/alternatives/${e.slug}`);
  const images = [e.ogImage || ogImageUrl(e.h1, 'Alternatives')];
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

export default async function Page({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params;
  const e = getEntry('alternative', competitor);
  if (!e) notFound();
  return <ContentArticle entry={e} />;
}
