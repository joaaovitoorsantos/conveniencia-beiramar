import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Páginas que não precisam de autenticação
    const publicPages = ['/login'];
    // Páginas que precisam de autenticação (todas exceto as públicas)
    const isPublicPage = publicPages.some(page => request.nextUrl.pathname === page);

    // Verifica se existe o token de autenticação
    const token = request.cookies.get('auth_token')?.value;

    // Se estiver em uma página pública (login) e já estiver autenticado, redireciona para o dashboard
    if (isPublicPage && token) {
        const dashboardUrl = new URL('/', request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    // Se não for uma página pública e não houver token, redireciona para o login
    if (!isPublicPage && !token) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

// Configura em quais caminhos o middleware será executado
export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|public|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp)).*)',
    ],
}; 