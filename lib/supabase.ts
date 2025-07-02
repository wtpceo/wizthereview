import { createClient } from '@supabase/supabase-js'

// 환경 변수 직접 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 디버깅용 로그
console.log('🔍 Supabase 환경 변수 확인:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPrefix: supabaseUrl?.substring(0, 30) + '...',
  keyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
})

// 환경 변수 검증
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL이 설정되지 않음')
  throw new Error('Supabase URL이 설정되지 않았습니다.')
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않음')
  throw new Error('Supabase Anon Key가 설정되지 않았습니다.')
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

console.log('✅ Supabase 클라이언트 초기화 완료')

// 서버 사이드용 관리자 클라이언트
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase // Service Role Key가 없으면 일반 클라이언트 사용

console.log('🔑 Service Role Key 상태:', {
  exists: !!serviceRoleKey,
  length: serviceRoleKey?.length || 0
})

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
          answer_guide: string
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: number
          platform_name: string
          platform_id: string
          platform_password: string
          shop_id: string
          answer_guide?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          platform_name?: string
          platform_id?: string
          platform_password?: string
          shop_id?: string
          answer_guide?: string
          updated_at?: string
        }
      }
    }
  }
} 