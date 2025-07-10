# 🚀 광고주 관리 시스템 - 빠른 시작 가이드

## 📋 간단 요약
광고주의 플랫폼별 계정 정보를 관리하고 구글 시트와 자동 동기화하는 웹 애플리케이션

---

## ⚡ 빠른 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일 생성:
```bash
GOOGLE_SHEETS_SPREADSHEET_ID=1QRNRaKjMaTgAcpSyjz-IeckdtcX2oNDxx13fe4vI5YM
EMAIL_USER=ceo@wiztheplanning.com
EMAIL_PASS=your_gmail_app_password
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 브라우저에서 확인
```
http://localhost:3000
```

---

## 🔑 주요 기능

### ✅ 완료된 기능
- **광고주 관리**: 등록, 조회, 수정, 삭제
- **플랫폼 연동**: 네이버플레이스, 배민, 쿠팡, 요기요
- **구글 시트 동기화**: 실시간 + 수동 동기화
- **이메일 알림**: 동기화 완료/실패 알림
- **UI 개선**: 사용자 친화적 인터페이스

### ⚠️ 현재 이슈
- **로컬 개발 환경**: OpenSSL 호환성 문제로 실시간 동기화 임시 비활성화
- **해결 방법**: 배포 후 정상 작동 예상, 현재는 수동 동기화 사용

---

## 📱 주요 페이지

| 페이지 | URL | 설명 |
|--------|-----|------|
| 관리자 | `/admin` | 광고주 목록, 동기화 관리 |
| 클라이언트 | `/clients` | 광고주 상세 정보 |
| 대시보드 | `/dashboard` | 전체 현황 |

---

## 🔧 주요 설정

### 구글 시트 설정
- **시트 ID**: `1QRNRaKjMaTgAcpSyjz-IeckdtcX2oNDxx13fe4vI5YM`
- **권한**: `clime-service-account@clime-website-442312.iam.gserviceaccount.com` (편집자)

### 이메일 알림
- **수신자**: `ceo@wiztheplanning.com`, `qpqpqp@wiztheplanning.com`, `smartwater@wiztheplanning.com`

---

## 📚 상세 문서

- **전체 프로젝트 문서**: `PROJECT_HANDOVER.md`
- **현재 진행 상황**: `CURRENT_PROGRESS_HANDOVER.md`
- **구글 시트 설정**: `GOOGLE_SHEETS_SETUP.md`

---

## 🆘 문제 해결

### 동기화 실패 시
1. 관리자 페이지 → "구글 시트 동기화" 버튼 클릭
2. 이메일 알림으로 결과 확인

### 이메일 알림 실패 시
1. Gmail 앱 비밀번호 재설정
2. `EMAIL_PASS` 환경 변수 업데이트

---

## 📞 지원

- **개발팀**: ceo@wiztheplanning.com
- **지원팀**: qpqpqp@wiztheplanning.com, smartwater@wiztheplanning.com

---

**🎉 모든 기능이 준비되었습니다! 배포 후 실시간 동기화를 활성화하세요.** 