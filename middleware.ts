import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // /register-client 경로는 인증 없이 접근 가능
  if (pathname === '/register-client') {
    return NextResponse.next();
  }
  
  // /clients 경로는 인증된 사용자만 접근 가능
  if (pathname.startsWith('/clients')) {
    const session = request.cookies.get('session');
    
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/clients/:path*', '/register-client'],
};