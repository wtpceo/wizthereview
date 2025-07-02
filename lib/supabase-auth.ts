import { createBrowserClient } from '@supabase/ssr'
import type { UserProfile, UserRole } from './types'

// 환경 변수 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 브라우저용 Supabase 클라이언트 (인증용)
export function createClientAuth() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// 현재 사용자 프로필 가져오기 (클라이언트용)
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClientAuth()
  
  try {
    // 현재 인증된 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('인증되지 않은 사용자')
      return null
    }

    // 사용자 프로필 정보 조회
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
        agencies:agency_id (
          name
        )
      `)
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('프로필 조회 실패:', profileError)
      return null
    }

    if (!profile) {
      console.log('프로필이 존재하지 않음')
      return null
    }

    // 마지막 로그인 시간 업데이트
    await supabase
      .from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role as UserRole,
      agency_id: profile.agency_id,
      agency_name: profile.agencies?.name,
      is_active: profile.is_active,
      last_login: profile.last_login,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }
  } catch (error) {
    console.error('사용자 프로필 조회 중 오류:', error)
    return null
  }
}

// 서버에서 현재 사용자 프로필 가져오기
export async function getCurrentUserProfileServer(): Promise<UserProfile | null> {
  const supabase = createServerSupabaseClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }

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
        agencies:agency_id (
          name
        )
      `)
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role as UserRole,
      agency_id: profile.agency_id,
      agency_name: profile.agencies?.name,
      is_active: profile.is_active,
      last_login: profile.last_login,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }
  } catch (error) {
    console.error('서버에서 사용자 프로필 조회 중 오류:', error)
    return null
  }
}

// 권한 확인 함수
export function hasPermission(userRole: UserRole | null, requiredRole: UserRole): boolean {
  if (!userRole) return false
  
  const roleHierarchy = {
    super_admin: 3,
    agency_admin: 2,
    agency_staff: 1,
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// 페이지 접근 권한 확인
export function canAccessPage(userRole: UserRole | null, pathname: string): boolean {
  if (!userRole) return false
  
  const pagePermissions: Record<string, UserRole[]> = {
    '/dashboard': ['super_admin', 'agency_admin', 'agency_staff'],
    '/clients': ['super_admin', 'agency_admin', 'agency_staff'],
    '/admin': ['super_admin'],
    '/agency/settings': ['agency_admin'],
  }
  
  const allowedRoles = pagePermissions[pathname]
  if (!allowedRoles) return true // 제한되지 않은 페이지
  
  return allowedRoles.includes(userRole)
}

// 로그인 함수
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClientAuth()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return { error: error.message }
    }
    
    return { data }
  } catch (error) {
    return { error: '로그인 중 오류가 발생했습니다.' }
  }
}

// 로그아웃 함수
export async function signOut() {
  const supabase = createClientAuth()
  const { error } = await supabase.auth.signOut()
  return { error }
}

// 회원가입 함수 (슈퍼 관리자만 사용)
export async function signUpUser(email: string, password: string, userData: {
  full_name: string
  role: UserRole
  agency_id?: number
}) {
  const supabase = createClientAuth()
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData.full_name,
          role: userData.role,
          agency_id: userData.agency_id,
        }
      }
    })
    
    if (error) {
      return { error: error.message }
    }
    
    return { data }
  } catch (error) {
    return { error: '회원가입 중 오류가 발생했습니다.' }
  }
} 