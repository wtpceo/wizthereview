import { createClient } from '@supabase/supabase-js'

// 환경 변수 확인 및 에러 처리
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not defined')
    throw new Error('Supabase URL이 설정되지 않았습니다. .env.local 파일을 확인해주세요.')
  }
  
  if (!supabaseAnonKey) {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
    throw new Error('Supabase ANON KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요.')
  }
  
  // URL과 키의 유효성 검사
  if (!supabaseUrl.startsWith('https://')) {
    throw new Error('Supabase URL 형식이 올바르지 않습니다.')
  }
  
  if (!supabaseAnonKey.startsWith('eyJ')) {
    throw new Error('Supabase API 키 형식이 올바르지 않습니다.')
  }
  
  return { supabaseUrl, supabaseAnonKey }
}

// 클라이언트 사이드에서 사용할 Supabase 클라이언트
let supabaseClient: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseClient) {
    try {
      const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
      console.log('✅ Supabase 클라이언트 초기화 성공')
    } catch (error) {
      console.error('❌ Supabase 클라이언트 초기화 실패:', error)
      throw error
    }
  }
  return supabaseClient
})()

// 서버 사이드에서 사용할 Supabase 클라이언트 (Service Role Key 사용)
let supabaseAdminClient: ReturnType<typeof createClient> | null = null

export const supabaseAdmin = (() => {
  if (!supabaseAdminClient) {
    try {
      const { supabaseUrl } = getSupabaseConfig()
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!serviceRoleKey) {
        console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY가 설정되지 않음 - 관리자 기능 제한')
        // 서비스 롤 키가 없으면 일반 클라이언트 반환
        return supabase
      }
      
      supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      console.log('✅ Supabase 관리자 클라이언트 초기화 성공')
    } catch (error) {
      console.error('❌ Supabase 관리자 클라이언트 초기화 실패:', error)
      // 실패 시 일반 클라이언트 반환
      return supabase
    }
  }
  return supabaseAdminClient || supabase
})()

// 데이터베이스 타입 정의
export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: number
          name: string
          email: string
          phone: string
          status: 'active' | 'inactive' | 'pending'
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          email: string
          phone: string
          status?: 'active' | 'inactive' | 'pending'
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          email?: string
          phone?: string
          status?: 'active' | 'inactive' | 'pending'
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: number
          store_name: string
          business_number: string
          owner_phone: string
          agency_id: number
          memo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          store_name: string
          business_number: string
          owner_phone: string
          agency_id: number
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          store_name?: string
          business_number?: string
          owner_phone?: string
          agency_id?: number
          memo?: string | null
          updated_at?: string
        }
      }
      client_platforms: {
        Row: {
          id: number
          client_id: number
          platform_name: string
          platform_id: string
          platform_password: string
          shop_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: number
          platform_name: string
          platform_id: string
          platform_password: string
          shop_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          platform_name?: string
          platform_id?: string
          platform_password?: string
          shop_id?: string
          updated_at?: string
        }
      }
    }
  }
} 