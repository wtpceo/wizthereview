-- 멀티 테넌트 시스템을 위한 확장 스키마
-- 기존 database-schema.sql 실행 후 이 파일을 실행하세요

-- 1. 사용자 프로필 테이블 (Supabase Auth와 연동)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'agency_staff' CHECK (role IN ('super_admin', 'agency_admin', 'agency_staff')),
    agency_id BIGINT REFERENCES agencies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_agency_for_non_super_admin CHECK (
        (role = 'super_admin' AND agency_id IS NULL) OR 
        (role != 'super_admin' AND agency_id IS NOT NULL)
    )
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_agency_id ON user_profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);

-- 3. Updated_at 트리거 추가
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. 기존 RLS 정책 삭제 (보안 강화를 위해)
DROP POLICY IF EXISTS "Enable read access for all users" ON agencies;
DROP POLICY IF EXISTS "Enable read access for all users" ON clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON client_platforms;
DROP POLICY IF EXISTS "Enable insert for all users" ON agencies;
DROP POLICY IF EXISTS "Enable insert for all users" ON clients;
DROP POLICY IF EXISTS "Enable insert for all users" ON client_platforms;
DROP POLICY IF EXISTS "Enable update for all users" ON agencies;
DROP POLICY IF EXISTS "Enable update for all users" ON clients;
DROP POLICY IF EXISTS "Enable update for all users" ON client_platforms;
DROP POLICY IF EXISTS "Enable delete for all users" ON agencies;
DROP POLICY IF EXISTS "Enable delete for all users" ON clients;
DROP POLICY IF EXISTS "Enable delete for all users" ON client_platforms;

-- 6. 새로운 RLS 정책 생성

-- 6.1 user_profiles 테이블 정책
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can manage all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- 6.2 agencies 테이블 정책
CREATE POLICY "Super admins can access all agencies" ON agencies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Agency users can view their own agency" ON agencies
    FOR SELECT USING (
        id IN (
            SELECT agency_id FROM user_profiles 
            WHERE id = auth.uid() AND agency_id IS NOT NULL
        )
    );

CREATE POLICY "Agency admins can update their own agency" ON agencies
    FOR UPDATE USING (
        id IN (
            SELECT agency_id FROM user_profiles 
            WHERE id = auth.uid() AND role = 'agency_admin'
        )
    );

-- 6.3 clients 테이블 정책
CREATE POLICY "Super admins can access all clients" ON clients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Agency users can access their agency clients" ON clients
    FOR SELECT USING (
        agency_id IN (
            SELECT agency_id FROM user_profiles 
            WHERE id = auth.uid() AND agency_id IS NOT NULL
        )
    );

CREATE POLICY "Agency admins can manage their agency clients" ON clients
    FOR ALL USING (
        agency_id IN (
            SELECT agency_id FROM user_profiles 
            WHERE id = auth.uid() AND role = 'agency_admin'
        )
    );

-- 6.4 client_platforms 테이블 정책
CREATE POLICY "Super admins can access all client platforms" ON client_platforms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Agency users can access their agency client platforms" ON client_platforms
    FOR SELECT USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN user_profiles up ON c.agency_id = up.agency_id
            WHERE up.id = auth.uid() AND up.agency_id IS NOT NULL
        )
    );

CREATE POLICY "Agency admins can manage their agency client platforms" ON client_platforms
    FOR ALL USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN user_profiles up ON c.agency_id = up.agency_id
            WHERE up.id = auth.uid() AND up.role = 'agency_admin'
        )
    );

-- 7. 초기 슈퍼 관리자 계정 생성 함수
CREATE OR REPLACE FUNCTION create_super_admin_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- 첫 번째 사용자를 슈퍼 관리자로 설정
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE role = 'super_admin') THEN
        INSERT INTO user_profiles (id, email, full_name, role, agency_id)
        VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'super_admin', NULL);
    ELSE
        -- 나머지 사용자는 수동으로 설정해야 함
        INSERT INTO user_profiles (id, email, full_name, role, agency_id)
        VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'agency_staff', NULL);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 새 사용자 등록시 자동 프로필 생성 트리거
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_super_admin_profile();

-- 9. 유틸리티 함수들

-- 현재 사용자 정보 조회
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    full_name VARCHAR,
    role VARCHAR,
    agency_id BIGINT,
    agency_name VARCHAR
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.full_name,
        up.role,
        up.agency_id,
        a.name as agency_name
    FROM user_profiles up
    LEFT JOIN agencies a ON up.agency_id = a.id
    WHERE up.id = auth.uid();
END;
$$;

-- 사용자 권한 확인 함수
CREATE OR REPLACE FUNCTION check_user_permission(required_role VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT role INTO user_role 
    FROM user_profiles 
    WHERE id = auth.uid();
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 슈퍼 관리자는 모든 권한 보유
    IF user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- 요청된 권한과 사용자 권한 비교
    CASE required_role
        WHEN 'agency_admin' THEN
            RETURN user_role IN ('agency_admin', 'super_admin');
        WHEN 'agency_staff' THEN
            RETURN user_role IN ('agency_staff', 'agency_admin', 'super_admin');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$;

-- 10. 초기 테스트 데이터 (개발용)
-- 실제 운영에서는 제거하세요
COMMENT ON TABLE user_profiles IS '사용자 프로필 테이블 - Supabase Auth와 연동';
COMMENT ON COLUMN user_profiles.role IS 'super_admin: 전체 관리자, agency_admin: 대행사 관리자, agency_staff: 대행사 직원';
COMMENT ON FUNCTION get_current_user_profile() IS '현재 로그인한 사용자의 프로필 정보 반환';
COMMENT ON FUNCTION check_user_permission(VARCHAR) IS '사용자 권한 확인 함수'; 