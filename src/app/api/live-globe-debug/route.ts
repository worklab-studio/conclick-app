import { NextResponse } from 'next/server';

// Temporary diagnostics sink for the Live globe: the client posts a render
// health snapshot; we log it so `fly logs` shows what the user's browser
// actually did. No data is stored. Remove once the blank-globe report closes.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // eslint-disable-next-line no-console
    console.log('[live-globe-debug]', JSON.stringify(body).slice(0, 2000));
  } catch {
    /* ignore malformed payloads */
  }
  return new NextResponse(null, { status: 204 });
}
