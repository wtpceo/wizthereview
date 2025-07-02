# Clime 프로젝트 Supabase 연결 가이드

이 문서는 Clime 광고 대행사 관리 시스템을 Supabase와 연결하는 방법을 안내합니다.

## 📋 사전 준비사항

1. [Supabase](https://supabase.com) 계정 생성
2. Node.js 및 npm 설치 확인

## 🚀 단계별 설정 가이드

### 1단계: Supabase 프로젝트 생성

1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인
2. "New Project" 버튼 클릭
3. 프로젝트 정보 입력:
   - **Name**: `clime-database` (원하는 이름으로 변경 가능)
   - **Database Password**: 강력한 비밀번호 생성 (기억해두세요!)
   - **Region**: `Northeast Asia (Seoul)` 추천
4. "Create new project" 클릭하고 프로젝트 생성 완료까지 대기

### 2단계: 데이터베이스 스키마 생성

1. Supabase 대시보드에서 생성한 프로젝트 선택
2. 왼쪽 메뉴에서 **"SQL Editor"** 클릭
3. 프로젝트 루트에 있는 `database-schema.sql` 파일의 내용을 복사
4. SQL Editor에 붙여넣기하고 **"RUN"** 버튼 클릭
5. 성공 메시지 확인

### 3단계: API 키 및 URL 확인

1. 왼쪽 메뉴에서 **"Settings"** > **"API"** 클릭
2. 다음 정보들을 복사해두세요:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public**: `eyJ...` (공개 키)
   - **service_role**: `eyJ...` (서비스 롤 키, 비밀로 관리!)

### 4단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database URL (optional)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres
```

**⚠️ 중요**: 
- `your-project-id`, `your_anon_public_key`, `your_service_role_key`를 실제 값으로 변경
- `.env.local` 파일은 절대 Git에 커밋하지 마세요!

### 5단계: 테이블 확인

1. Supabase 대시보드의 **"Table Editor"**에서 다음 테이블들이 생성되었는지 확인:
   - `agencies` (대행사)
   - `clients` (광고주)
   - `client_platforms` (플랫폼 정보)

2. 각 테이블에 테스트 데이터가 삽입되어 있는지 확인

### 6단계: 프로젝트 실행 및 테스트

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:3000 접속
```

## 🔧 데이터베이스 구조 설명

### `agencies` 테이블
- 광고 대행사 정보 저장
- 각 대행사별로 고유 ID 할당

### `clients` 테이블
- 광고주(매장) 정보 저장
- `agency_id`로 대행사와 연결

### `client_platforms` 테이블
- 각 광고주의 플랫폼별 로그인 정보 저장
- 지원 플랫폼: 네이버플레이스, 배달의민족, 쿠팡이츠, 요기요, 땡겨요, 배달이음, 카카오매장

## 🛡️ 보안 설정 (중요!)

현재는 개발/테스트 목적으로 모든 사용자가 데이터에 접근할 수 있도록 설정되어 있습니다.

**프로덕션 환경에서는 반드시 다음 보안 설정을 적용하세요:**

1. **RLS 정책 수정**: 각 대행사가 자신의 데이터만 접근할 수 있도록 제한
2. **인증 시스템 구현**: Supabase Auth를 사용한 로그인 시스템
3. **API 키 관리**: Service Role Key는 서버 사이드에서만 사용

## 🔍 트러블슈팅

### 연결 오류 발생 시
1. `.env.local` 파일의 URL과 키 값 재확인
2. Supabase 프로젝트가 활성 상태인지 확인
3. 브라우저 개발자 도구의 Network 탭에서 API 호출 확인

### 데이터가 표시되지 않을 때
1. SQL Editor에서 테이블 생성 스크립트 재실행
2. Table Editor에서 테스트 데이터 존재 여부 확인
3. RLS 정책이 올바르게 설정되었는지 확인

### 권한 오류 발생 시
1. anon key와 service role key 재확인
2. RLS 정책 설정 점검
3. 테이블별 권한 설정 확인

## 📞 추가 지원

더 자세한 정보가 필요하시면:
- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js + Supabase 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

---

**참고**: 이 가이드는 개발 환경 설정을 위한 것입니다. 프로덕션 배포 시에는 추가적인 보안 설정이 필요합니다. 