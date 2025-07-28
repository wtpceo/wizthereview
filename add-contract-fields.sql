-- 계약 관련 필드 추가
-- clients 테이블에 contract_start_date, contract_period, contract_end_date 칼럼 추가

-- 계약 시작일 칼럼 추가
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS contract_start_date DATE;

-- 계약 기간 칼럼 추가 (개월 단위)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS contract_period INTEGER;

-- 계약 종료일 칼럼 추가
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS contract_end_date DATE;

-- 컬럼에 주석 추가 (설명)
COMMENT ON COLUMN clients.contract_start_date IS '계약 시작일';
COMMENT ON COLUMN clients.contract_period IS '계약 기간 (개월)';
COMMENT ON COLUMN clients.contract_end_date IS '계약 종료일';

-- 인덱스 추가 (검색 성능 향상을 위해)
CREATE INDEX IF NOT EXISTS idx_clients_contract_end_date ON clients(contract_end_date);
CREATE INDEX IF NOT EXISTS idx_clients_contract_start_date ON clients(contract_start_date);

-- 업데이트 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clients' AND column_name IN ('contract_start_date', 'contract_period', 'contract_end_date');