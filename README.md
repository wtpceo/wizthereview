# Clime - 광고 대행사 관리 시스템 🚀

> **스마트한 광고 대행사를 위한 올인원 관리 솔루션**

## 📋 프로젝트 소개

Clime은 광고 대행사가 고객(광고주)과 다양한 플랫폼 계정을 효율적으로 관리할 수 있도록 설계된 웹 애플리케이션입니다. 직관적인 대시보드와 강력한 데이터 관리 기능을 통해 광고 운영의 생산성을 극대화합니다.

## ✨ 주요 기능

### 🎯 핵심 기능
- **대시보드**: 실시간 통계 및 주요 지표 모니터링
- **광고주 관리**: 고객 정보 및 플랫폼 계정 통합 관리
- **플랫폼 연동**: 네이버, 구글, 페이스북 등 주요 광고 플랫폼 계정 관리
- **데이터 내보내기**: 플랫폼 계정 정보를 포함한 엑셀 보고서 생성

### 🔐 고급 기능
- **멀티 테넌트 시스템**: 대행사별 데이터 분리 및 권한 관리
- **실시간 검색 및 필터링**: 빠른 데이터 조회
- **모바일 반응형**: 모든 디바이스에서 최적화된 사용자 경험

## 🛠 기술 스택

### Frontend
- **Next.js 14** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성 보장
- **Tailwind CSS** - 유틸리티 퍼스트 CSS 프레임워크
- **shadcn/ui** - 모던한 UI 컴포넌트 라이브러리

### Backend & Database
- **Supabase** - PostgreSQL 기반 BaaS
- **Row Level Security (RLS)** - 데이터베이스 레벨 보안

### 유틸리티
- **XLSX** - 엑셀 파일 처리
- **Lucide React** - 아이콘 라이브러리
- **date-fns** - 날짜 처리

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18+ 
- pnpm (권장) 또는 npm
- Supabase 계정

### 1. 프로젝트 클론
```bash
git clone https://github.com/wtpceo/wizthereview.git
cd wizthereview
```

### 2. 의존성 설치
```bash
pnpm install --legacy-peer-deps
# 또는
npm install --legacy-peer-deps
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 내용을 추가합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. 데이터베이스 설정
Supabase 대시보드에서 `database-schema.sql` 파일의 내용을 실행합니다.

### 5. 개발 서버 실행
```bash
pnpm dev
# 또는
npm run dev
```

http://localhost:3000 에서 애플리케이션을 확인할 수 있습니다.

## 📁 프로젝트 구조

```
clime-website/
├── app/                    # Next.js App Router
│   ├── dashboard/         # 대시보드 페이지
│   ├── clients/          # 광고주 관리 페이지
│   └── admin/            # 관리자 페이지
├── components/           # 재사용 가능한 컴포넌트
│   ├── ui/              # shadcn/ui 컴포넌트
│   └── layout/          # 레이아웃 컴포넌트
├── lib/                 # 유틸리티 함수
│   ├── supabase.ts     # Supabase 클라이언트
│   ├── database.ts     # 데이터베이스 함수
│   └── excel-utils.ts  # 엑셀 처리 유틸리티
└── database-schema.sql  # 데이터베이스 스키마
```

## 📊 데이터베이스 스키마

### 주요 테이블
- **agencies**: 대행사 정보
- **clients**: 광고주 정보  
- **platforms**: 플랫폼 정보
- **client_platforms**: 광고주-플랫폼 계정 연결

자세한 스키마는 `database-schema.sql` 파일을 참조하세요.

## 🔧 개발 가이드

### 코드 스타일
- TypeScript strict 모드 사용
- ESLint + Prettier 적용
- 컴포넌트는 함수형으로 작성
- Tailwind CSS 유틸리티 클래스 활용

### 브랜치 전략
- `main`: 프로덕션 배포 브랜치
- `develop`: 개발 통합 브랜치  
- `feature/*`: 기능 개발 브랜치

## 🚀 배포

### Vercel 배포 (권장)
1. GitHub 저장소를 Vercel에 연결
2. 환경 변수 설정
3. 자동 배포 완료

### 수동 배포
```bash
pnpm build
pnpm start
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 연락처

**위트페어코퍼레이션**  
- 웹사이트: [https://witpair.co.kr](https://witpair.co.kr)
- 이메일: contact@witpair.co.kr

## 🙏 감사의 말

- [Next.js](https://nextjs.org/) - 멋진 React 프레임워크
- [Supabase](https://supabase.io/) - 훌륭한 Firebase 대안
- [shadcn/ui](https://ui.shadcn.com/) - 아름다운 UI 컴포넌트
- [Tailwind CSS](https://tailwindcss.com/) - 유연한 CSS 프레임워크

---

⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요! 