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
  const [initialized, setInitialized] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // 현재 사용자 프로필 가져오기
  const fetchUserProfile = async (skipLoading = false, retryCount = 0) => {
    console.log('👤 사용자 프로필 조회 시작... (시도:', retryCount + 1, ')')
    
    if (!skipLoading && !authChecked) {
      setLoading(true)
    }
    
    try {
      // Supabase 클라이언트가 placeholder인지 확인
      console.log('🔍 1단계: 환경 변수 확인...')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        console.warn('⚠️ Supabase 환경 변수가 설정되지 않음 - 인증 건너뛰기')
        setUser(null)
        setLoading(false)
        setInitialized(true)
        setAuthChecked(true)
        return
      }
      console.log('✅ 환경 변수 OK:', supabaseUrl.substring(0, 30) + '...')

      console.log('🔍 2단계: 인증된 사용자 확인 중...')
      
      // 타임아웃을 추가해서 무한 대기 방지
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('인증 확인 타임아웃')), 8000) // 8초로 단축
      })
      
      const authPromise = supabase.auth.getUser()
      
      const { data: { user: authUser }, error: authError } = await Promise.race([authPromise, timeoutPromise]) as any
      
      console.log('📊 인증 사용자 확인 결과:', {
        hasUser: !!authUser,
        userId: authUser?.id,
        userEmail: authUser?.email,
        hasError: !!authError,
        errorMessage: authError?.message
      })
      
      if (authError) {
        console.error('❌ 인증 확인 오류:', authError)
        
        // 인증 오류 시 재시도 (최대 2회)
        if (retryCount < 2 && authError.message !== '인증 확인 타임아웃') {
          console.log('🔄 인증 확인 재시도...')
          setTimeout(() => fetchUserProfile(skipLoading, retryCount + 1), 1000)
          return
        }
        
        setUser(null)
        setLoading(false)
        setInitialized(true)
        setAuthChecked(true)
        return
      }
      
      if (!authUser) {
        console.log('ℹ️ 인증된 사용자 없음 (로그아웃 상태)')
        setUser(null)
        setLoading(false)
        setInitialized(true)
        setAuthChecked(true)
        return
      }

      // 기존 사용자와 동일한지 확인 (불필요한 업데이트 방지)
      if (user && user.id === authUser.id && skipLoading) {
        console.log('ℹ️ 동일한 사용자 - 프로필 조회 건너뛰기')
        setLoading(false)
        setInitialized(true)
        setAuthChecked(true)
        return
      }

      // 사용자 프로필 조회
      console.log('🔍 3단계: 프로필 조회 중...', authUser.id)
      
      const { data: profileData, error: profileError } = await supabase
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
        hasProfile: !!profileData,
        hasError: !!profileError,
        errorMessage: profileError?.message,
        errorCode: profileError?.code
      })

      let profile = profileData

      if (profileError) {
        console.error('❌ 프로필 조회 실패:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details
        })
        
        // 프로필이 없는 경우만 기본 프로필 생성 시도
        if (profileError.code === 'PGRST116') { // No rows returned
          console.log('🔧 프로필이 없음 - 기본 프로필 생성 시도...')
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('user_profiles')
              .insert([{
                id: authUser.id,
                email: authUser.email,
                full_name: authUser.email,
                role: 'agency_staff',
                is_active: true
              }])
              .select()
              .single()
            
            if (createError) {
              console.error('❌ 기본 프로필 생성 실패:', createError)
              // 기존 사용자가 있다면 유지, 없다면 null로 설정
              if (!user) {
                setUser(null)
              }
              setLoading(false)
              setInitialized(true)
              setAuthChecked(true)
              return
            }
            
            console.log('✅ 기본 프로필 생성 성공')
            profile = newProfile
          } catch (error) {
            console.error('💥 프로필 생성 예외:', error)
            // 기존 사용자가 있다면 유지
            if (!user) {
              setUser(null)
            }
            setLoading(false)
            setInitialized(true)
            setAuthChecked(true)
            return
          }
        } else {
          // 네트워크 오류 등의 경우 기존 사용자 상태 유지
          console.warn('⚠️ 프로필 조회 실패 - 기존 상태 유지')
          setLoading(false)
          setInitialized(true)
          setAuthChecked(true)
          return
        }
      }
      
      if (!profile) {
        console.error('❌ 프로필 데이터 없음')
        if (!user) {
          setUser(null)
        }
        setLoading(false)
        setInitialized(true)
        setAuthChecked(true)
        return
      }

      console.log('✅ 프로필 조회 성공:', {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        agency_id: profile.agency_id
      })

      // 마지막 로그인 시간 업데이트 (백그라운드에서 실행, 실패해도 무시)
      if (!skipLoading) {
        console.log('🔍 4단계: 로그인 시간 업데이트...')
        // 백그라운드에서 비동기로 실행하고 에러는 무시
        ;(async () => {
          try {
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ last_login: new Date().toISOString() })
              .eq('id', authUser.id)
            
            if (updateError) {
              console.warn('⚠️ 로그인 시간 업데이트 실패:', updateError.message)
            } else {
              console.log('✅ 로그인 시간 업데이트 성공')
            }
          } catch (error) {
            console.warn('⚠️ 로그인 시간 업데이트 중 예외 발생 (무시)')
          }
        })()
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
      setLoading(false)
      setInitialized(true)
      setAuthChecked(true)
    } catch (error: any) {
      console.error('💥 프로필 조회 예외 발생:', error)
      
      // 네트워크 오류나 임시적 오류의 경우 기존 상태 유지
      if (error?.message?.includes('타임아웃') || error?.message?.includes('network')) {
        console.warn('⚠️ 네트워크 오류 - 기존 상태 유지')
      } else if (!user) {
        setUser(null)
      }
      
      setLoading(false)
      setInitialized(true)
      setAuthChecked(true)
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
      await fetchUserProfile(false, 0) // 처음부터 시작
      
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
      setLoading(false)
      setInitialized(true)
      setAuthChecked(true)
      
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
      setLoading(false)
      setInitialized(true)
      setAuthChecked(true)
    }
  }

  // 사용자 프로필 새로고침
  const refreshUser = async () => {
    console.log('🔄 사용자 프로필 새로고침 요청')
    await fetchUserProfile(true, 0) // 로딩 상태 건너뛰기, 재시도 카운트 리셋
  }

  // 인증 상태 변화 감지
  useEffect(() => {
    let mounted = true
    let authListener: any = null
    
    const initAuth = async () => {
      try {
        // 환경 변수 확인
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
          console.warn('⚠️ Supabase 환경 변수가 설정되지 않음 - 인증 리스너 건너뛰기')
          if (mounted) {
            setLoading(false)
            setInitialized(true)
            setAuthChecked(true)
          }
          return
        }

        // 초기 세션 확인 및 사용자 프로필 로드
        console.log('🔄 초기 인증 상태 확인 중...')
        await fetchUserProfile(false, 0)

        // 인증 상태 변화 리스너 설정
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔄 인증 상태 변경:', event, !!session)
            
            if (!mounted) return
            
            if (event === 'SIGNED_IN' && session?.user) {
              console.log('✅ 로그인 감지 - 프로필 새로고침')
              await fetchUserProfile(true, 0)
            } else if (event === 'SIGNED_OUT') {
              console.log('🚪 로그아웃 감지 - 사용자 정보 초기화')
              setUser(null)
              setLoading(false)
              setInitialized(true)
              setAuthChecked(true)
            } else if (event === 'TOKEN_REFRESHED' && session?.user) {
              console.log('🔄 토큰 갱신 감지 - 가벼운 확인만 수행')
              // 토큰 갱신 시에는 전체 프로필을 다시 조회하지 않고 간단한 확인만
              if (user && user.id === session.user.id) {
                console.log('ℹ️ 동일한 사용자 토큰 갱신 - 상태 유지')
              } else {
                console.log('⚠️ 다른 사용자 토큰 - 프로필 새로고침')
                await fetchUserProfile(true, 0)
              }
            }
          }
        )

        authListener = subscription

        // 컴포넌트 언마운트 시 구독 해제
        return () => {
          console.log('🧹 인증 리스너 정리')
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('❌ 인증 초기화 실패:', error)
        if (mounted) {
          setLoading(false)
          setInitialized(true)
          setAuthChecked(true)
        }
      }
    }

    initAuth()

    return () => {
      mounted = false
      if (authListener) {
        authListener.unsubscribe()
      }
    }
  }, [])

  const value: AuthContextType = {
    user,
    loading: loading && !authChecked, // authChecked 상태도 고려
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