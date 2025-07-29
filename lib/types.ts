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
  guide?: string;
  service?: string;
  contract_months: number;
  contract_start_date?: string;
  contract_period?: number;
  contract_end_date?: string;
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

// 파일 타입 열거형
export type FileType = 'id_card' | 'contract' | 'business_registration';

// 파일 타입 한글 매핑
export const FILE_TYPE_LABELS: Record<FileType, string> = {
  id_card: '신분증',
  contract: '계약서',
  business_registration: '사업자 등록증'
};

// 클라이언트 파일 타입
export interface ClientFile {
  id: number;
  client_id: number;
  file_type: FileType;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by?: string;
  uploaded_at: string;
  updated_at: string;
}

// 파일 업로드 요청 타입
export interface FileUploadRequest {
  client_id: number;
  file_type: FileType;
  file: File;
}

// 파일 업로드 응답 타입
export interface FileUploadResponse {
  success: boolean;
  file_id?: number;
  file_path?: string;
  error?: string;
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