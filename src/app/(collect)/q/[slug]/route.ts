export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { notFound } from '@/lib/response';
import { findLink } from '@/queries/prisma';
import { POST } from '@/app/api/send/route';
import { Link } from '@/generated/prisma/client';
import redis from '@/lib/redis';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let link: Link;

  if (redis.enabled) {
    link = await redis.client.fetch(
      `link:${slug}`,
      async () => {
        return findLink({
          where: {
            slug,
          },
        });
      },
      86400,
    );

    if (!link) {
      return notFound();
    }
  } else {
    link = await findLink({
      where: {
        slug,
      },
    });

    if (!link) {
      return notFound();
    }
  }

  const payload = {
    type: 'event',
    payload: {
      link: link.id,
      url: request.url,
      referrer: request.headers.get('referer'),
    },
  };

  const req = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(payload),
  });

  await POST(req);

  // Only redirect to http(s) targets. link.url is validated as a free string
  // on create, so without this guard a stored `javascript:`/`data:` URL would
  // turn this public endpoint into a scheme-elevation / open-redirect vector.
  let safeTarget: string;
  try {
    const parsed = new URL(link.url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return notFound();
    }
    safeTarget = parsed.toString();
  } catch {
    return notFound();
  }

  return NextResponse.redirect(safeTarget);
}
