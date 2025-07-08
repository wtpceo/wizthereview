# Supabase 파일 업로드 설정 가이드

## 1. 데이터베이스 설정

### 데이터베이스 테이블 생성
Supabase 대시보드 → SQL Editor에서 다음 SQL을 실행하세요:

```sql
-- add-client-files-table.sql 파일의 내용을 실행하세요
```

`add-client-files-table.sql` 파일의 전체 내용을 복사하여 SQL Editor에 붙여넣고 실행하세요.

## 2. Supabase Storage 설정

### 버킷 생성
1. Supabase 대시보드 → Storage 메뉴로 이동
2. "New bucket" 버튼 클릭
3. 버킷 설정:
   - **Bucket name**: `client-files`
   - **Public bucket**: ❌ 체크 해제 (비공개 버킷)
   - **File size limit**: 10MB
   - **Allowed MIME types**: `image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### 버킷 정책 설정
버킷 생성 후 Policies 탭에서 다음 정책들을 추가하세요:

#### 1. 파일 업로드 정책
```sql
-- 인증된 사용자만 파일 업로드 가능
CREATE POLICY "Authenticated users can upload files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'client-files');
```

#### 2. 파일 다운로드 정책
```sql
-- 자신이 접근 권한이 있는 클라이언트의 파일만 다운로드 가능
CREATE POLICY "Users can download authorized client files" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'client-files' AND
        (
            -- 슈퍼 관리자는 모든 파일 접근 가능
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE id = auth.uid() AND role = 'super_admin'
            )
            OR
            -- 대행사 사용자는 자신의 대행사 클라이언트 파일만 접근 가능
            EXISTS (
                SELECT 1 FROM client_files cf
                JOIN clients c ON cf.client_id = c.id
                JOIN user_profiles up ON c.agency_id = up.agency_id
                WHERE up.id = auth.uid() 
                AND up.agency_id IS NOT NULL
                AND (storage.foldername(name))[1] = c.id::text
            )
        )
    );
```

#### 3. 파일 삭제 정책
```sql
-- 업로드한 사용자나 관리자만 파일 삭제 가능
CREATE POLICY "Users can delete their uploaded files" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'client-files' AND
        (
            -- 슈퍼 관리자는 모든 파일 삭제 가능
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE id = auth.uid() AND role = 'super_admin'
            )
            OR
            -- 대행사 사용자는 자신의 대행사 클라이언트 파일만 삭제 가능
            EXISTS (
                SELECT 1 FROM client_files cf
                JOIN clients c ON cf.client_id = c.id
                JOIN user_profiles up ON c.agency_id = up.agency_id
                WHERE up.id = auth.uid() 
                AND up.agency_id IS NOT NULL
                AND (storage.foldername(name))[1] = c.id::text
            )
        )
    );
```

## 3. 환경 변수 확인

`.env.local` 파일에 Supabase 설정이 올바르게 되어 있는지 확인하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 4. 지원되는 파일 형식

### 신분증
- 이미지 파일: JPG, PNG, WebP
- 문서 파일: PDF

### 계약서
- 이미지 파일: JPG, PNG, WebP
- 문서 파일: PDF, DOC, DOCX

### CMS 신청서
- 이미지 파일: JPG, PNG, WebP
- 문서 파일: PDF, DOC, DOCX

### 파일 크기 제한
- 최대 파일 크기: 10MB
- 각 파일 타입당 1개씩만 업로드 가능 (덮어쓰기 방식)

## 5. 사용 방법

1. **파일 업로드**: 광고주 수정 모드에서 "파일 관리" 섹션에서 파일을 업로드할 수 있습니다.
2. **파일 다운로드**: 업로드된 파일은 "다운로드" 버튼을 클릭하여 다운로드할 수 있습니다.
3. **파일 삭제**: "삭제" 버튼을 클릭하여 파일을 삭제할 수 있습니다.
4. **파일 확인**: 광고주 목록에서 "파일관리" 버튼을 클릭하여 파일 상태를 확인할 수 있습니다.

## 6. 엑셀 다운로드

파일 정보도 엑셀 다운로드에 포함됩니다:
- "3. 파일 정보" 시트에서 모든 파일 정보를 확인할 수 있습니다.
- 파일 타입, 파일명, 파일 크기, 업로드일 등이 포함됩니다.

## 7. 보안 고려사항

- 모든 파일은 비공개 버킷에 저장됩니다.
- 슈퍼 관리자는 모든 파일에 접근 가능합니다.
- 대행사 사용자는 자신의 대행사 클라이언트 파일만 접근 가능합니다.
- 파일 다운로드 URL은 1시간 후 만료됩니다.
- 파일 업로드 시 MIME 타입과 크기를 검증합니다.

## 8. 문제 해결

### 파일 업로드 실패 시
1. 파일 형식이 지원되는지 확인
2. 파일 크기가 10MB 이하인지 확인
3. 브라우저 개발자 도구의 Network 탭에서 에러 메시지 확인

### 파일 다운로드 실패 시
1. 파일이 존재하는지 확인
2. 사용자에게 해당 파일 접근 권한이 있는지 확인
3. Supabase Storage 정책이 올바르게 설정되었는지 확인

### 권한 오류 시
1. RLS 정책이 올바르게 설정되었는지 확인
2. 사용자의 역할(role)과 대행사 정보가 올바른지 확인
3. client_files 테이블의 RLS가 활성화되었는지 확인 