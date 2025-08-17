import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PAGES = ['/login', '/test-auth'];
const AUTH_PAGES = ['/login'];

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'sua-chave-secreta-super-segura');

async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;



  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // Verificar token se presente
  const payload = token ? await verifyJWT(token) : null;

  // Se é página de auth e tem token válido, redirecionar para home
  if (isAuthPage && payload) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Se não é página pública e não tem token válido, redirecionar para login
  if (!isPublicPage && !payload) {
    // Se tem token inválido, remover o cookie
    if (token) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
    
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Permitir acesso
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp)).*)',
  ],
};