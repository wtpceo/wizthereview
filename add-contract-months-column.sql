-- 계약 개월수 컬럼 추가
-- clients 테이블에 contract_months 컬럼 추가 (기본값 12개월)

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS contract_months INTEGER DEFAULT 12 CHECK (contract_months > 0 AND contract_months <= 120);

-- 기존 데이터에 기본값 설정 (계약 개월수가 NULL인 경우)
UPDATE clients 
SET contract_months = 12 
WHERE contract_months IS NULL;

-- 컬럼에 NOT NULL 제약 조건 추가
ALTER TABLE clients 
ALTER COLUMN contract_months SET NOT NULL;

-- 컬럼에 주석 추가 (설명)
COMMENT ON COLUMN clients.contract_months IS '계약 개월수 (1~120개월)'; 