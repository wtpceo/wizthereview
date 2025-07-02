'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-context'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    // 보안 강화: 프로덕션에서 더 엄격한 검증
    const isProduction = process.env.NODE_ENV === 'production'
    console.log('🏠 메인 페이지 접근 - 환경:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT')
    
    if (!loading) {
      if (user) {
        console.log('👤 인증된 사용자 감지 - 대시보드로 이동:', user.email)
        router.push('/dashboard')
      } else {
        console.log('🔐 미인증 사용자 - 로그인 페이지로 이동')
        
        // 프로덕션에서는 세션 정리 후 리다이렉트
        if (isProduction && typeof window !== 'undefined') {
          console.log('🛡️ 프로덕션에서 브라우저 스토리지 예방적 정리')
          try {
            // 의심스러운 세션 데이터 정리
            const keysToCheck = []
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key && (key.includes('supabase') || key.includes('auth'))) {
                keysToCheck.push(key)
              }
            }
            if (keysToCheck.length > 0) {
              console.log('🧹 의심스러운 세션 데이터 발견, 정리 중:', keysToCheck)
              keysToCheck.forEach(key => localStorage.removeItem(key))
              sessionStorage.clear()
            }
          } catch (error) {
            console.warn('⚠️ 스토리지 정리 중 오류 (무시):', error)
          }
        }
        
        router.push('/login')
      }
    }
  }, [user, loading, router])

  // 로딩 중이거나 리다이렉트 대기 중
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Clime</h1>
          <p className="text-gray-600">
            {loading ? '로딩 중...' : '리다이렉트 중...'}
          </p>
        </div>
      </div>
    </div>
  )
}
