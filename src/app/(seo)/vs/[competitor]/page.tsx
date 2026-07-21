import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEntry, comparisonParams } from '@/content';
import { canonical, ogMeshUrl } from '@/lib/seo';
import { heroWordFor, meshKeyFor } from '@/lib/mesh/word';
import { ContentArticle } from '@/components/seo/ContentArticle';

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return comparisonParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const e = getEntry('comparison', competitor);
  if (!e) return {};
  const url = canonical(`/vs/${e.slug}`);
  const images = [e.ogImage || ogMeshUrl(meshKeyFor(e), heroWordFor(e))];
  return {
    // absolute: comparison titles already start with "Conclick vs …" — the layout's
    // "| Conclick" suffix would double the brand and waste ~10 SERP characters.
    title: { absolute: e.metaTitle },
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
  const e = getEntry('comparison', competitor);
  if (!e) notFound();
  return <ContentArticle entry={e} />;
}
