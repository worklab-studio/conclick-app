import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { checkAuth } from '@/lib/auth';

// 2 MB — generous for an avatar, low enough to keep memory usage bounded.
const MAX_BYTES = 2 * 1024 * 1024;

// Whitelist of image MIME types we accept. Anything else is rejected outright
// so .html/.svg/.php/etc. can't be uploaded and served from /profile-images
// as XSS/malware. SVG is excluded — it can contain inline JS.
const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export async function POST(request: Request) {
  try {
    // Require authentication. The previous handler was fully anonymous, so
    // anyone could fill the disk or host arbitrary files under the trusted
    // origin. Clerk migration will tighten further; this is the stop-gap.
    const auth = await checkAuth(request);
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_BYTES} bytes.` },
        { status: 413 },
      );
    }

    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PNG, JPEG, WEBP, GIF allowed.' },
        { status: 415 },
      );
    }

    const bytes = await file.arrayBuffer();
    // Defence in depth: the browser-reported size can lie. Re-check after
    // materializing.
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large.' }, { status: 413 });
    }
    const buffer = Buffer.from(bytes);

    // Server-decided filename and extension — never trust file.name.
    const filename = `${uuidv4()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public/profile-images');
    const filepath = path.join(uploadDir, filename);

    // Ensure dir exists (no-op if already present).
    await mkdir(uploadDir, { recursive: true });
    await writeFile(filepath, buffer);

    const url = `/profile-images/${filename}`;

    return NextResponse.json({ url });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
