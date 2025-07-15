# 보안 설정 가이드

## 🔐 환경 변수 설정

### 1. 환경 파일 생성
`.env.local.example` 파일을 복사하여 `.env.local` 파일을 생성하세요:
```bash
cp .env.local.example .env.local
```

### 2. Google Service Account 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" > "사용자 인증 정보" 이동
4. "사용자 인증 정보 만들기" > "서비스 계정" 선택
5. 서비스 계정 생성 후 JSON 키 다운로드
6. Google Sheets API 활성화

#### JSON 키를 환경 변수로 변환하는 방법:

```javascript
// 1. JSON 파일을 읽어서 문자열로 변환
const fs = require('fs');
const serviceAccount = JSON.parse(fs.readFileSync('path/to/your-key.json', 'utf8'));

// 2. 개행문자를 이스케이프 처리
const jsonString = JSON.stringify(serviceAccount).replace(/\n/g, '\\n');

// 3. 결과를 .env.local 파일에 복사
console.log(`GOOGLE_SERVICE_ACCOUNT_KEY='${jsonString}'`);
```

### 3. 기타 환경 변수 설정

#### Supabase
1. [Supabase Dashboard](https://app.supabase.com/)에서 프로젝트 생성
2. Settings > API에서 URL과 키 복사

#### Gmail 앱 비밀번호 (이메일 알림용)
1. Google 계정 설정 > 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성

#### Resend API (대체 이메일 서비스)
1. [Resend](https://resend.com/) 가입
2. API Keys 섹션에서 키 생성

## 🛡️ 보안 체크리스트

- [ ] `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] 모든 민감한 정보가 환경 변수로 관리되는지 확인
- [ ] Google Service Account에 최소 권한만 부여
- [ ] 정기적으로 API 키 및 비밀번호 갱신
- [ ] Git 히스토리에 민감한 정보가 없는지 확인

## ⚠️ 주의사항

1. **절대 하드코딩하지 마세요**: API 키, 비밀번호, 인증 정보를 코드에 직접 입력하지 마세요.
2. **Git 히스토리 정리**: 실수로 민감한 정보를 커밋했다면 BFG Repo-Cleaner 등을 사용해 제거하세요.
3. **키 노출 시 즉시 조치**: 키가 노출되었다면 즉시 무효화하고 새로 발급받으세요.

## 📚 참고 자료

- [Google Cloud Service Account 문서](https://cloud.google.com/iam/docs/service-accounts)
- [Supabase 환경 변수 가이드](https://supabase.com/docs/guides/functions/secrets)
- [Next.js 환경 변수 문서](https://nextjs.org/docs/basic-features/environment-variables)