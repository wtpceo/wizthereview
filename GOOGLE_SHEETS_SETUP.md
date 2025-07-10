# 🔗 구글 시트 자동 동기화 설정 가이드

## 📋 현재 상황
광고주 정보가 새로 등록될 때 구글 시트에 자동으로 동기화되는 기능이 구현되어 있지만, 환경 변수 설정이 필요합니다.

## ⚠️ 문제 원인
1. **환경 변수 미설정**: `GOOGLE_SHEETS_SPREADSHEET_ID`가 설정되지 않음
2. **이메일 설정 미완료**: 알림 이메일 설정이 완료되지 않음

## 🛠️ 해결 방법

### 방법 1: 환경 변수 설정 (권장)

1. **프로젝트 루트에 `.env.local` 파일 생성**
```bash
# 구글 시트 설정 (필수)
GOOGLE_SHEETS_SPREADSHEET_ID=your_actual_spreadsheet_id_here

# 이메일 알림 설정 (선택사항)
EMAIL_USER=ceo@wiztheplanning.com
EMAIL_PASS=your_gmail_app_password_here
```

2. **구글 시트 ID 확인하기**
   - 구글 시트 URL: `https://docs.google.com/spreadsheets/d/[이_부분이_ID]/edit`
   - 예시: `1ABC123...XYZ789` 형태의 긴 문자열

3. **Gmail 앱 비밀번호 설정** (이메일 알림을 원하는 경우)
   - Gmail 2단계 인증 활성화
   - 구글 계정 → 보안 → 앱 비밀번호 생성
   - 생성된 16자리 비밀번호를 `EMAIL_PASS`에 설정

### 방법 2: 코드 직접 수정

`lib/google-sheets.ts` 파일에서 다음 라인을 수정:

```typescript
// 현재 (387번째 줄 근처)
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 
  'PUT_YOUR_ACTUAL_SPREADSHEET_ID_HERE'

// 수정 후
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 
  '1ABC123...XYZ789' // 실제 구글 시트 ID
```

## ✅ 확인 방법

### 1. 로그 확인
새 광고주 등록 시 서버 콘솔에서 다음 로그 확인:
- `🚀 실시간 구글 시트 동기화 시작...`
- `📊 사용할 스프레드시트 ID: 1ABC123...`
- `✅ 실시간 구글 시트 동기화 완료`

### 2. 오류 발생 시 체크리스트
- [ ] 구글 시트 ID가 올바른지 확인
- [ ] 구글 시트에 서비스 계정 접근 권한 부여 확인
- [ ] `.env.local` 파일이 프로젝트 루트에 있는지 확인
- [ ] 서버 재시작 후 테스트

## 🔧 디버깅

### 디버그 API 사용
```bash
curl https://your-domain.com/api/debug-sync
```

### 수동 동기화 테스트
관리자 페이지에서 "구글 시트 동기화" 버튼 클릭하여 수동 동기화 테스트

## 📞 문제 해결
문제가 지속되면 서버 로그를 확인하고 다음 정보를 제공해주세요:
1. 콘솔 로그 메시지
2. 구글 시트 URL
3. 새 광고주 등록 시도 시간 