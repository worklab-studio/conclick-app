import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protect Admin Routes
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        const adminSession = request.cookies.get('conclick_admin_session');

        if (!adminSession) {
            const url = request.nextUrl.clone();
            url.pathname = '/admin/login';
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
