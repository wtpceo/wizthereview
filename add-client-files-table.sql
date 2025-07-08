-- 광고주 파일 관리를 위한 테이블 생성
-- 신분증, 계약서, CMS 신청서 등의 파일을 저장

-- 파일 타입 열거형 생성
CREATE TYPE file_type AS ENUM (
    'id_card',        -- 신분증
    'contract',       -- 계약서
    'cms_application' -- CMS 신청서
);

-- 클라이언트 파일 테이블 생성
CREATE TABLE IF NOT EXISTS client_files (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    file_type file_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by TEXT, -- 업로드한 사용자 (auth.uid() 또는 이메일)
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약 조건: 같은 클라이언트의 같은 파일 타입은 하나만 허용
    UNIQUE(client_id, file_type)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_client_files_client_id ON client_files(client_id);
CREATE INDEX IF NOT EXISTS idx_client_files_type ON client_files(file_type);
CREATE INDEX IF NOT EXISTS idx_client_files_uploaded_at ON client_files(uploaded_at);

-- 컬럼 주석 추가
COMMENT ON TABLE client_files IS '광고주 관련 파일 저장 테이블';
COMMENT ON COLUMN client_files.file_type IS '파일 타입: id_card(신분증), contract(계약서), cms_application(CMS신청서)';
COMMENT ON COLUMN client_files.file_path IS 'Supabase Storage 파일 경로';
COMMENT ON COLUMN client_files.file_size IS '파일 크기 (bytes)';

-- RLS (Row Level Security) 정책 설정
ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;

-- 슈퍼 관리자는 모든 파일에 접근 가능
CREATE POLICY "Super admins can access all client files" ON client_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- 대행사 사용자는 자신의 대행사 클라이언트 파일만 접근 가능
CREATE POLICY "Agency users can access their agency client files" ON client_files
    FOR ALL USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN user_profiles up ON c.agency_id = up.agency_id
            WHERE up.id = auth.uid() AND up.agency_id IS NOT NULL
        )
    );

-- Supabase Storage 버킷 생성 (수동으로 생성해야 함)
-- 버킷 이름: 'client-files'
-- 정책: 인증된 사용자만 업로드/다운로드 가능

-- 파일 업로드 함수 (선택사항)
CREATE OR REPLACE FUNCTION upload_client_file(
    p_client_id BIGINT,
    p_file_type file_type,
    p_file_name VARCHAR(255),
    p_file_path VARCHAR(500),
    p_file_size BIGINT,
    p_mime_type VARCHAR(100)
) RETURNS BIGINT AS $$
DECLARE
    file_id BIGINT;
BEGIN
    -- 기존 파일이 있으면 교체, 없으면 새로 생성
    INSERT INTO client_files (
        client_id, file_type, file_name, file_path, 
        file_size, mime_type, uploaded_by
    ) VALUES (
        p_client_id, p_file_type, p_file_name, p_file_path,
        p_file_size, p_mime_type, auth.uid()::TEXT
    )
    ON CONFLICT (client_id, file_type) 
    DO UPDATE SET 
        file_name = EXCLUDED.file_name,
        file_path = EXCLUDED.file_path,
        file_size = EXCLUDED.file_size,
        mime_type = EXCLUDED.mime_type,
        uploaded_by = EXCLUDED.uploaded_by,
        updated_at = NOW()
    RETURNING id INTO file_id;
    
    RETURN file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 파일 삭제 함수
CREATE OR REPLACE FUNCTION delete_client_file(
    p_file_id BIGINT
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM client_files WHERE id = p_file_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 클라이언트 파일 조회 함수
CREATE OR REPLACE FUNCTION get_client_files(
    p_client_id BIGINT
) RETURNS TABLE (
    id BIGINT,
    file_type file_type,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cf.id,
        cf.file_type,
        cf.file_name,
        cf.file_path,
        cf.file_size,
        cf.mime_type,
        cf.uploaded_by,
        cf.uploaded_at,
        cf.updated_at
    FROM client_files cf
    WHERE cf.client_id = p_client_id
    ORDER BY cf.file_type, cf.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 업데이트 확인
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'client_files' 
ORDER BY ordinal_position;

-- 파일 타입 확인
SELECT unnest(enum_range(NULL::file_type)) AS file_types; 