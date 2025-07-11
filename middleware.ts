import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // /register-client 경로는 인증 없이 접근 가능
  if (pathname === '/register-client') {
    return NextResponse.next();
  }
  
  // 현재는 모든 요청을 통과시킴 (인증은 클라이언트 사이드에서 처리)
  return NextResponse.next();
}

export const config = {
  matcher: ['/clients/:path*', '/register-client'],
};