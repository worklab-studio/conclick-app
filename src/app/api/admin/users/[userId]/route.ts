import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAdmin } from '@/lib/auth';
import { userRoleParam } from '@/lib/schema';
import { deleteUser, getUser, updateUser } from '@/queries/prisma/user';

// Explicit allowlist of admin-editable fields. Critically EXCLUDES password,
// id, clerkId, and the password-reset columns — the previous handler passed
// raw req.json() straight to Prisma, allowing privilege escalation and
// credential overwrite.
const updateSchema = z.object({
  username: z.string().max(255).optional(),
  displayName: z.string().max(255).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  role: userRoleParam.optional(),
  subscriptionStatus: z.string().max(50).nullable().optional(),
  subscriptionPlan: z.string().max(50).nullable().optional(),
  trialEndsAt: z.coerce.date().nullable().optional(),
  currentPeriodEndsAt: z.coerce.date().nullable().optional(),
  subscriptionEndsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

function isUuid(v: string) {
  return z.uuid().safeParse(v).success;
}

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!(await checkAdmin(req))) return new NextResponse('Unauthorized', { status: 401 });
  const { userId } = await params;

  if (!isUuid(userId)) return new NextResponse('Bad Request', { status: 400 });

  const user = await getUser(userId);
  if (!user) return new NextResponse('Not Found', { status: 404 });

  return NextResponse.json(user);
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!(await checkAdmin(req))) return new NextResponse('Unauthorized', { status: 401 });
  const { userId } = await params;

  if (!isUuid(userId)) return new NextResponse('Bad Request', { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const existing = await getUser(userId);
  if (!existing) return new NextResponse('Not Found', { status: 404 });

  try {
    const updated = await updateUser(userId, parsed.data as any);
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Username or email already in use' }, { status: 400 });
    }
    console.error('Admin user update error:', e?.message ?? e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!(await checkAdmin(req))) return new NextResponse('Unauthorized', { status: 401 });
  const { userId } = await params;

  if (!isUuid(userId)) return new NextResponse('Bad Request', { status: 400 });

  try {
    await deleteUser(userId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return new NextResponse('Not Found', { status: 404 });
    console.error('Admin user delete error:', e?.message ?? e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
