// 사용자 역할 타입
export type UserRole = 'super_admin' | 'agency_admin' | 'agency_staff';

// 사용자 프로필 타입
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  agency_id?: number;
  agency_name?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// 인증 컨텍스트 타입
export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// 권한 확인 타입
export interface PermissionCheck {
  hasPermission: boolean;
  userRole: UserRole | null;
  agencyId: number | null;
}

// 대행사 타입 (기존)
export interface Agency {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

// 클라이언트 타입 (기존)
export interface Client {
  id: number;
  store_name: string;
  business_number: string;
  owner_phone: string;
  agency_id: number;
  agency_name?: string;
  memo?: string;
  contract_months: number;
  created_at: string;
  updated_at: string;
}

// 플랫폼 타입 (기존)
export interface ClientPlatform {
  id: number;
  client_id: number;
  platform_name: string;
  platform_id: string;
  platform_password: string;
  shop_id: string;
  created_at: string;
  updated_at: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// 페이지별 권한 설정
export const PAGE_PERMISSIONS = {
  '/dashboard': ['super_admin', 'agency_admin', 'agency_staff'],
  '/clients': ['super_admin', 'agency_admin', 'agency_staff'],
  '/admin': ['super_admin'],
  '/agency/settings': ['agency_admin'],
} as const;

// 역할별 권한 레벨
export const ROLE_HIERARCHY = {
  super_admin: 3,
  agency_admin: 2,
  agency_staff: 1,
} as const; 