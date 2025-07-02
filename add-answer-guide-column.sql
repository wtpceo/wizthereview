-- client_platforms 테이블에 답변 지침 컬럼 추가
ALTER TABLE client_platforms 
ADD COLUMN IF NOT EXISTS answer_guide TEXT;

-- 답변 지침 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN client_platforms.answer_guide IS '플랫폼 관련 문의나 설정 시 참고할 답변 지침';

-- 기존 데이터에 대해 빈 문자열로 초기화 (NULL 대신)
UPDATE client_platforms 
SET answer_guide = '' 
WHERE answer_guide IS NULL; 