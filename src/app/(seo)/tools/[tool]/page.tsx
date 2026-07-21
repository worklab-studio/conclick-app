import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getEntry, toolParams } from '@/content';
import { canonical, ogMeshUrl } from '@/lib/seo';
import { heroWordFor, meshKeyFor } from '@/lib/mesh/word';
import { ContentArticle } from '@/components/seo/ContentArticle';
import { UtmBuilder } from '@/components/seo/tools/UtmBuilder';

// Each tool slug maps to its interactive widget, rendered right after the intro.
const WIDGETS: Record<string, ReactNode> = {
  'utm-builder': <UtmBuilder />,
};

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return toolParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const e = getEntry('tool', tool);
  if (!e) return {};
  const url = canonical(`/tools/${e.slug}`);
  const images = [e.ogImage || ogMeshUrl(meshKeyFor(e), heroWordFor(e))];
  return {
    title: e.metaTitle,
    description: e.metaDescription,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: e.metaTitle, description: e.metaDescription, siteName: 'Conclick', images },
    twitter: { card: 'summary_large_image', title: e.metaTitle, description: e.metaDescription, images },
  };
}

export default async function Page({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const e = getEntry('tool', tool);
  if (!e) notFound();
  return <ContentArticle entry={e}>{WIDGETS[e.slug] ?? null}</ContentArticle>;
}
