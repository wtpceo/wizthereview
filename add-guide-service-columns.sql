-- 지침 및 서비스 칼럼 추가
-- clients 테이블에 guide와 service 칼럼 추가

-- 지침 칼럼 추가 (선택사항)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS guide TEXT;

-- 서비스 칼럼 추가 (선택사항)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS service TEXT;

-- 컬럼에 주석 추가 (설명)
COMMENT ON COLUMN clients.guide IS '광고주 관리 지침';
COMMENT ON COLUMN clients.service IS '제공 서비스 내용';

-- 인덱스 추가 (검색 성능 향상을 위해)
CREATE INDEX IF NOT EXISTS idx_clients_guide ON clients USING gin(to_tsvector('korean', guide));
CREATE INDEX IF NOT EXISTS idx_clients_service ON clients USING gin(to_tsvector('korean', service));

-- 업데이트 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clients' AND column_name IN ('guide', 'service'); 