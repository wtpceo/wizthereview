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
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      console.log('🔍 인증 사용자 확인:', authUser?.id, authUser?.email)
      
      if (authError || !authUser) {
        console.log('❌ 인증 에러 또는 사용자 없음:', authError)
        setUser(null)
        return
      }

      // 사용자 프로필 조회
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

      if (profileError || !profile) {
        console.error('❌ 프로필 조회 실패:', profileError)
        console.log('🔍 조회된 프로필 데이터:', profile)
        setUser(null)
        return
      }

      console.log('✅ 프로필 조회 성공:', profile)

      // 마지막 로그인 시간 업데이트
      await supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authUser.id)

      // 타입 안전하게 처리
      const agencies = profile.agencies as any
      const agencyName = Array.isArray(agencies) ? agencies[0]?.name : agencies?.name

      setUser({
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
      })
    } catch (error) {
      console.error('사용자 프로필 조회 중 오류:', error)
      setUser(null)
    }
  }

  // 로그인 함수
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        return { error: error.message }
      }
      
      // 로그인 성공 후 프로필 새로고침
      await fetchUserProfile()
      return {}
    } catch (error) {
      return { error: '로그인 중 오류가 발생했습니다.' }
    }
  }

  // 로그아웃 함수
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // 사용자 프로필 새로고침
  const refreshUser = async () => {
    await fetchUserProfile()
  }

  // 인증 상태 변화 감지
  useEffect(() => {
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