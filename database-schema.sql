-- Clime 광고 대행사 관리 시스템 데이터베이스 스키마

-- 1. 대행사 테이블
CREATE TABLE IF NOT EXISTS agencies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 광고주(클라이언트) 테이블
CREATE TABLE IF NOT EXISTS clients (
    id BIGSERIAL PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    business_number VARCHAR(20) NOT NULL UNIQUE,
    owner_phone VARCHAR(20) NOT NULL,
    agency_id BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 클라이언트 플랫폼 정보 테이블
CREATE TABLE IF NOT EXISTS client_platforms (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    platform_name VARCHAR(50) NOT NULL CHECK (platform_name IN (
        '네이버플레이스', '배달의민족', '쿠팡이츠', '요기요', 
        '땡겨요', '배달이음', '카카오매장'
    )),
    platform_id VARCHAR(255) NOT NULL,
    platform_password VARCHAR(255) NOT NULL,
    shop_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, platform_name)
);

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_number ON clients(business_number);
CREATE INDEX IF NOT EXISTS idx_client_platforms_client_id ON client_platforms(client_id);
CREATE INDEX IF NOT EXISTS idx_agencies_email ON agencies(email);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(status);

-- 5. Updated_at 자동 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Updated_at 트리거 생성
CREATE TRIGGER update_agencies_updated_at 
    BEFORE UPDATE ON agencies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_platforms_updated_at 
    BEFORE UPDATE ON client_platforms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS (Row Level Security) 정책 활성화
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_platforms ENABLE ROW LEVEL SECURITY;

-- 8. 기본 정책 생성 (필요에 따라 수정)
-- 모든 사용자가 읽을 수 있도록 (추후 인증 시스템에 맞게 수정)
CREATE POLICY "Enable read access for all users" ON agencies FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON clients FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON client_platforms FOR SELECT USING (true);

-- 모든 사용자가 삽입할 수 있도록 (추후 인증 시스템에 맞게 수정)
CREATE POLICY "Enable insert for all users" ON agencies FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON client_platforms FOR INSERT WITH CHECK (true);

-- 모든 사용자가 업데이트할 수 있도록 (추후 인증 시스템에 맞게 수정)
CREATE POLICY "Enable update for all users" ON agencies FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON clients FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON client_platforms FOR UPDATE USING (true);

-- 모든 사용자가 삭제할 수 있도록 (추후 인증 시스템에 맞게 수정)
CREATE POLICY "Enable delete for all users" ON agencies FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON clients FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON client_platforms FOR DELETE USING (true);

-- 9. 초기 데이터 삽입 (테스트용)
INSERT INTO agencies (name, email, phone, status) VALUES
('ABC 광고대행사', 'contact@abc-agency.com', '02-1234-5678', 'active'),
('XYZ 마케팅', 'info@xyz-marketing.com', '02-2345-6789', 'active'),
('123 디지털', 'hello@123digital.com', '02-3456-7890', 'pending')
ON CONFLICT (email) DO NOTHING;

-- ABC 광고대행사의 ID를 가져와서 테스트 클라이언트 데이터 삽입
DO $$
DECLARE
    abc_agency_id BIGINT;
BEGIN
    SELECT id INTO abc_agency_id FROM agencies WHERE name = 'ABC 광고대행사';
    
    IF abc_agency_id IS NOT NULL THEN
        INSERT INTO clients (store_name, business_number, owner_phone, agency_id, memo) VALUES
        ('맛있는 치킨집', '123-45-67890', '010-1234-5678', abc_agency_id, '주말 매출이 높음'),
        ('신선한 마트', '345-67-89012', '010-3456-7890', abc_agency_id, null)
        ON CONFLICT (business_number) DO NOTHING;
        
        -- 플랫폼 정보 추가
        INSERT INTO client_platforms (client_id, platform_name, platform_id, platform_password, shop_id)
        SELECT 
            c.id,
            platform_info.platform_name,
            platform_info.platform_id,
            platform_info.platform_password,
            platform_info.shop_id
        FROM clients c
        CROSS JOIN (
            VALUES 
                ('네이버플레이스', 'naver_chicken123', 'password123', 'shop001'),
                ('배달의민족', 'baemin_chicken', 'pass456', 'store001'),
                ('쿠팡이츠', 'coupang_chicken', 'pwd789', 'cp001')
        ) AS platform_info(platform_name, platform_id, platform_password, shop_id)
        WHERE c.business_number = '123-45-67890'
        ON CONFLICT (client_id, platform_name) DO NOTHING;
        
        INSERT INTO client_platforms (client_id, platform_name, platform_id, platform_password, shop_id)
        SELECT 
            c.id,
            platform_info.platform_name,
            platform_info.platform_id,
            platform_info.platform_password,
            platform_info.shop_id
        FROM clients c
        CROSS JOIN (
            VALUES 
                ('네이버플레이스', 'naver_mart456', 'martpass123', 'shop002'),
                ('쿠팡이츠', 'coupang_mart', 'martpwd456', 'cp002')
        ) AS platform_info(platform_name, platform_id, platform_password, shop_id)
        WHERE c.business_number = '345-67-89012'
        ON CONFLICT (client_id, platform_name) DO NOTHING;
    END IF;
END $$; 