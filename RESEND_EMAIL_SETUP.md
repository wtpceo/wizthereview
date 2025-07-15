# Resend를 사용한 간단한 이메일 설정

Gmail 앱 비밀번호 없이 간단하게 이메일을 보내는 방법입니다.

## 설정 방법 (5분 소요)

### 1. Resend 무료 계정 만들기

1. https://resend.com 접속
2. "Sign up" 클릭
3. 이메일로 회원가입 (무료)
4. 이메일 인증 완료

### 2. API 키 받기

1. 로그인 후 대시보드에서 "API Keys" 클릭
2. "Create API Key" 클릭
3. 이름 입력: "리뷰프로그램"
4. 생성된 API 키 복사 (re_로 시작하는 문자열)

### 3. 환경 변수 설정

`.env.local` 파일에서:

```
RESEND_API_KEY=re_123456789... (복사한 API 키 붙여넣기)
```

### 4. 서버 재시작

```bash
# Ctrl + C로 서버 중지
npm run dev
```

## 완료!

이제 광고주 등록 시 자동으로 이메일이 발송됩니다.

## 참고사항

- **무료 플랜**: 매달 100건 무료 (충분함)
- **발신자 주소**: 무료 플랜에서는 `onboarding@resend.dev`로 고정
- **수신자**: ceo@wiztheplanning.com, qpqpqp@wiztheplanning.com, smartwater@wiztheplanning.com

## 테스트

1. 광고주 관리 페이지에서 새 광고주 등록
2. 콘솔에서 "✅ 알림 이메일 발송 성공" 메시지 확인
3. 이메일 수신 확인

## 문제 해결

- **"Resend API 키가 설정되지 않았습니다"**: 환경 변수 설정 및 서버 재시작 확인
- **이메일이 안 옴**: 스팸 폴더 확인
- **API 키 오류**: Resend 대시보드에서 API 키 상태 확인