# 🏢 광고주 관리 시스템 프로젝트 인수인계 문서

## 📋 프로젝트 개요

### 🎯 목적
광고주(업체)의 플랫폼별 계정 정보를 체계적으로 관리하고, 구글 시트와 자동 동기화하여 업무 효율성을 높이는 웹 애플리케이션

### 🛠️ 기술 스택
- **Frontend**: Next.js 15.2.4, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Backend**: Next.js API Routes, Supabase
- **Database**: Supabase (PostgreSQL)
- **External API**: Google Sheets API, Gmail SMTP
- **Deployment**: Vercel (권장)

---

## 🏗️ 프로젝트 구조

```
clime-website/
├── app/                          # Next.js App Router
│   ├── admin/                    # 관리자 페이지
│   ├── clients/                  # 클라이언트 페이지  
│   ├── dashboard/                # 대시보드
│   ├── login/                    # 로그인 페이지
│   └── api/                      # API 엔드포인트
├── components/                   # 재사용 가능한 컴포넌트
│   ├── auth/                     # 인증 관련 컴포넌트
│   ├── layout/                   # 레이아웃 컴포넌트
│   └── ui/                       # UI 컴포넌트 (Radix UI)
├── lib/                          # 유틸리티 함수들
│   ├── database.ts               # 데이터베이스 CRUD 함수
│   ├── google-sheets.ts          # 구글 시트 연동
│   ├── email-service.ts          # 이메일 알림 서비스
│   └── supabase.ts              # Supabase 클라이언트
└── hooks/                        # 커스텀 React 훅
```

---

## 🗄️ 데이터베이스 구조

### 주요 테이블

#### 1. `agencies` (대행사)
```sql
- id: bigint (PK)
- name: text
- created_at: timestamptz
```

#### 2. `clients` (광고주)
```sql
- id: bigint (PK)
- agency_id: bigint (FK)
- store_name: text        # 업체명
- created_at: timestamptz
- updated_at: timestamptz
```

#### 3. `client_platforms` (플랫폼 정보)
```sql
- id: bigint (PK)
- client_id: bigint (FK)
- platform_name: text     # 네이버플레이스, 배달의민족, 쿠팡이츠, 요기요
- platform_id: text       # 플랫폼 계정 ID
- platform_password: text # 플랫폼 계정 비밀번호
- shop_id: text           # 상점 ID
- created_at: timestamptz
```

---

## 🔧 주요 기능

### 1. 광고주 관리
- **등록**: 업체명과 플랫폼별 계정 정보 입력
- **조회**: 등록된 광고주 목록 및 상세 정보
- **수정**: 기존 광고주 정보 업데이트
- **삭제**: 광고주 정보 삭제

### 2. 플랫폼 관리
- **지원 플랫폼**: 네이버플레이스, 배달의민족, 쿠팡이츠, 요기요
- **정보 관리**: 플랫폼별 계정 ID, 비밀번호, 상점 ID
- **UI 개선**: 사용자 친화적인 입력/표시 인터페이스

### 3. 구글 시트 자동 동기화
- **실시간 동기화**: 새 광고주 등록 시 자동 동기화
- **수동 동기화**: 관리자 페이지에서 일괄 동기화
- **중복 방지**: 업체명 + 플랫폼 ID 조합으로 중복 체크
- **플랫폼별 시트**: 각 플랫폼별로 별도 시트에 데이터 정리

### 4. 이메일 알림
- **동기화 완료 알림**: 개별/일괄 동기화 완료 시 이메일 발송
- **다중 수신자**: 여러 담당자에게 동시 발송
- **HTML 템플릿**: 구조화된 이메일 형식

---

## 🔑 환경 변수 설정

### `.env.local` 파일 생성 필요
```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 구글 시트 동기화
GOOGLE_SHEETS_SPREADSHEET_ID=1QRNRaKjMaTgAcpSyjz-IeckdtcX2oNDxx13fe4vI5YM

# 이메일 알림 (Gmail SMTP)
EMAIL_USER=ceo@wiztheplanning.com
EMAIL_PASS=your_gmail_app_password

# NextAuth 설정
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

---

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
npm install
# 또는
pnpm install
```

### 2. 개발 서버 실행
```bash
npm run dev
# 또는
pnpm dev
```

### 3. 빌드 및 배포
```bash
npm run build
npm start
```

---

## 📱 페이지 구조

### 1. 관리자 페이지 (`/admin`)
- 광고주 목록 조회
- 새 광고주 등록
- 구글 시트 수동 동기화
- 통계 정보 확인

### 2. 클라이언트 페이지 (`/clients`)  
- 광고주 상세 정보 조회
- 플랫폼 정보 수정
- 사용자 친화적 인터페이스

### 3. 대시보드 (`/dashboard`)
- 프로젝트 전체 현황
- 빠른 액세스 메뉴

---

## 🔧 핵심 파일 설명

### `lib/database.ts`
- 데이터베이스 CRUD 작업
- 광고주 생성 시 실시간 동기화 트리거
- Supabase 클라이언트 기반 데이터 조작

### `lib/google-sheets.ts`
- 구글 시트 API 연동
- 플랫폼별 시트 관리
- 중복 데이터 체크 및 방지
- 헤더 자동 생성

### `lib/email-service.ts`
- Gmail SMTP 기반 이메일 발송
- HTML 템플릿 지원
- 다중 수신자 처리

### `components/ui/`
- Radix UI 기반 재사용 컴포넌트
- 일관된 디자인 시스템
- 접근성 고려된 UI 컴포넌트

---

## 🎨 UI/UX 특징

### 1. 반응형 디자인
- 모바일, 태블릿, 데스크톱 지원
- Tailwind CSS 기반 반응형 레이아웃

### 2. 다크/라이트 모드
- 사용자 선택 가능한 테마
- 시스템 설정 자동 감지

### 3. 사용자 친화적 인터페이스
- 직관적인 플랫폼 정보 입력
- 명확한 피드백 메시지
- 로딩 상태 표시

---

## 🔒 보안 고려사항

### 1. 인증 및 권한
- Supabase Auth 기반 사용자 인증
- 역할 기반 접근 제어 (Admin/Client)

### 2. 데이터 보호
- 서버 사이드 데이터 검증
- SQL 인젝션 방지 (Supabase ORM)
- 환경 변수로 민감 정보 관리

### 3. API 보안
- 서비스 계정 기반 구글 API 접근
- 제한된 권한 스코프 설정

---

## 📊 모니터링 및 로깅

### 1. 콘솔 로깅
- 구글 시트 동기화 과정 상세 로그
- 에러 발생 시 스택 트레이스 출력
- 성공/실패 카운트 추적

### 2. 이메일 알림
- 동기화 결과 실시간 알림
- 오류 발생 시 즉시 알림

---

## 🔄 업데이트 및 유지보수

### 1. 정기 업데이트
- 의존성 패키지 업데이트
- 보안 패치 적용
- 기능 개선 및 버그 수정

### 2. 백업 전략
- Supabase 자동 백업 활용
- 구글 시트 버전 관리
- 코드 저장소 백업

---

## 📞 지원 및 문의

### 개발팀 연락처
- 이메일: ceo@wiztheplanning.com
- 추가 문의: qpqpqp@wiztheplanning.com, smartwater@wiztheplanning.com

### 문서 업데이트
- 마지막 수정: 2024-12-10
- 담당자: 시니어 풀스택 개발자
- 다음 리뷰 예정: 2024-12-24 