'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserProfile, AuthContextType, UserRole } from '@/lib/types'

// 인증 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 인증 프로바이더 컴포넌트
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // 현재 사용자 프로필 가져오기
  const fetchUserProfile = async () => {
    console.log('👤 사용자 프로필 조회 시작...')
    
    try {
      // Supabase 클라이언트가 placeholder인지 확인
      console.log('🔍 1단계: 환경 변수 확인...')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        console.warn('⚠️ Supabase 환경 변수가 설정되지 않음 - 인증 건너뛰기')
        setUser(null)
        setLoading(false)
        return
      }
      console.log('✅ 환경 변수 OK:', supabaseUrl.substring(0, 30) + '...')

      console.log('🔍 2단계: 인증된 사용자 확인 중...')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      console.log('📊 인증 사용자 확인 결과:', {
        hasUser: !!authUser,
        userId: authUser?.id,
        userEmail: authUser?.email,
        hasError: !!authError,
        errorMessage: authError?.message
      })
      
      if (authError) {
        console.error('❌ 인증 확인 오류:', authError)
        setUser(null)
        return
      }
      
      if (!authUser) {
        console.log('ℹ️ 인증된 사용자 없음 (로그아웃 상태)')
        setUser(null)
        return
      }

      // 사용자 프로필 조회
      console.log('🔍 3단계: 프로필 조회 중...', authUser.id)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          agency_id,
          is_active,
          last_login,
          created_at,
          updated_at,
          agencies (
            name
          )
        `)
        .eq('id', authUser.id)
        .single()

      console.log('📊 프로필 조회 결과:', {
        hasProfile: !!profile,
        hasError: !!profileError,
        errorMessage: profileError?.message,
        errorCode: profileError?.code,
        errorDetails: profileError?.details
      })

      if (profileError) {
        console.error('❌ 프로필 조회 실패:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        })
        setUser(null)
        return
      }
      
      if (!profile) {
        console.error('❌ 프로필 데이터 없음')
        setUser(null)
        return
      }

      console.log('✅ 프로필 조회 성공:', {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        agency_id: profile.agency_id,
        agencies: profile.agencies
      })

      // 마지막 로그인 시간 업데이트
      console.log('🔍 4단계: 로그인 시간 업데이트...')
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authUser.id)

      if (updateError) {
        console.warn('⚠️ 로그인 시간 업데이트 실패:', updateError.message)
        // 실패해도 계속 진행
      } else {
        console.log('✅ 로그인 시간 업데이트 성공')
      }

      // 타입 안전하게 처리
      const agencies = profile.agencies as any
      const agencyName = Array.isArray(agencies) ? agencies[0]?.name : agencies?.name

      const userData = {
        id: profile.id as string,
        email: profile.email as string,
        full_name: profile.full_name as string,
        role: profile.role as UserRole,
        agency_id: profile.agency_id as number,
        agency_name: agencyName as string,
        is_active: profile.is_active as boolean,
        last_login: profile.last_login as string,
        created_at: profile.created_at as string,
        updated_at: profile.updated_at as string,
      }

      console.log('🎉 5단계: 사용자 상태 설정 완료')
      setUser(userData)
    } catch (error) {
      console.error('💥 프로필 조회 예외 발생:', error)
      setUser(null)
    }
  }

  // 로그인 함수
  const signIn = async (email: string, password: string) => {
    console.log('🔐 로그인 함수 시작:', email)
    
    try {
      console.log('🔍 1단계: Supabase 인증 시도...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('📊 인증 결과:', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        hasError: !!error,
        errorMessage: error?.message
      })
      
      if (error) {
        console.error('❌ Supabase 인증 실패:', error.message)
        return { error: error.message }
      }
      
      if (!data?.user) {
        console.error('❌ 사용자 데이터 없음')
        return { error: '로그인에 실패했습니다.' }
      }
      
      console.log('✅ Supabase 인증 성공, 프로필 조회 시작...')
      
      // 로그인 성공 후 프로필 새로고침
      await fetchUserProfile()
      
      console.log('🎉 로그인 프로세스 완료!')
      return {}
    } catch (error) {
      console.error('💥 로그인 예외:', error)
      return { error: '로그인 중 오류가 발생했습니다.' }
    }
  }

  // 로그아웃 함수
  const signOut = async () => {
    try {
      console.log('🚪 로그아웃 시작...')
      
      // Supabase 세션 종료
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Supabase 로그아웃 오류:', error)
      } else {
        console.log('✅ Supabase 로그아웃 성공')
      }

      // 사용자 상태 초기화
      setUser(null)
      
      // 로컬 스토리지 정리 (선택적)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
      }
      
      console.log('✅ 로그아웃 완료')
    } catch (error) {
      console.error('❌ 로그아웃 중 오류:', error)
      // 오류가 발생해도 사용자 상태는 초기화
      setUser(null)
    }
  }

  // 사용자 프로필 새로고침
  const refreshUser = async () => {
    await fetchUserProfile()
  }

  // 인증 상태 변화 감지
  useEffect(() => {
    try {
      // 환경 변수 확인
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        console.warn('⚠️ Supabase 환경 변수가 설정되지 않음 - 인증 리스너 건너뛰기')
        setLoading(false)
        return
      }

      // 초기 사용자 확인
      fetchUserProfile()

      // 인증 상태 변화 리스너
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            await fetchUserProfile()
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
          }
          setLoading(false)
        }
      )

      return () => subscription.unsubscribe()
    } catch (error) {
      console.error('❌ 인증 리스너 설정 실패:', error)
      setLoading(false)
    }
  }, [])

  // 로딩 완료 후 설정
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// 커스텀 훅
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 권한 확인 훅
export function usePermission() {
  const { user } = useAuth()
  
  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!user) return false
    
    const roleHierarchy = {
      super_admin: 3,
      agency_admin: 2,
      agency_staff: 1,
    }
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
  }

  const canAccessPage = (pathname: string): boolean => {
    if (!user) return false
    
    const pagePermissions: Record<string, UserRole[]> = {
      '/dashboard': ['super_admin', 'agency_admin', 'agency_staff'],
      '/clients': ['super_admin', 'agency_admin', 'agency_staff'],
      '/admin': ['super_admin'],
      '/agency/settings': ['agency_admin'],
    }
    
    const allowedRoles = pagePermissions[pathname]
    if (!allowedRoles) return true
    
    return allowedRoles.includes(user.role)
  }

  const isSuperAdmin = user?.role === 'super_admin'
  const isAgencyAdmin = user?.role === 'agency_admin'
  const isAgencyStaff = user?.role === 'agency_staff'

  return {
    hasPermission,
    canAccessPage,
    isSuperAdmin,
    isAgencyAdmin,
    isAgencyStaff,
    userRole: user?.role || null,
    agencyId: user?.agency_id || null,
  }
} 