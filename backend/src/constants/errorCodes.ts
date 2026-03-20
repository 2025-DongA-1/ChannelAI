/**
 * errorCodes.ts
 * 서비스 전체 공통 에러 코드 정의
 *
 * 형식: {도메인}_{번호}
 *  - 001~099: 입력/유효성 오류 (4xx)
 *  - 100~199: 리소스 오류 (404 등)
 *  - 500~:    서버 내부 오류 (5xx)
 */

export const ERROR_CODES = {

  // ── 인증 (AUTH) ──────────────────────────────────────────────────────────
  AUTH: {
    INVALID_INPUT:        { code: 'AUTH_001', message: '입력값이 올바르지 않습니다.' },
    EMAIL_EXISTS:         { code: 'AUTH_002', message: '이미 사용 중인 이메일입니다.' },
    INVALID_CREDENTIALS:  { code: 'AUTH_003', message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
    TOKEN_EXPIRED:        { code: 'AUTH_004', message: '인증 토큰이 만료되었습니다.' },
    UNAUTHORIZED:         { code: 'AUTH_005', message: '인증이 필요합니다.' },
    SOCIAL_ACCOUNT:       { code: 'AUTH_006', message: '소셜 로그인으로 가입된 계정입니다. 소셜 로그인을 이용해주세요.' },
    WRONG_PASSWORD:       { code: 'AUTH_007', message: '현재 비밀번호가 올바르지 않습니다.' },
    USER_NOT_FOUND:       { code: 'AUTH_100', message: '사용자를 찾을 수 없습니다.' },
    SERVER_ERROR:         { code: 'AUTH_500', message: '인증 처리 중 오류가 발생했습니다.' },
  },

  // ── 리포트 (REPORT) ───────────────────────────────────────────────────────
  REPORT: {
    GENERATE_FAILED:      { code: 'REPORT_001', message: '리포트 생성 실패' },
    SEND_FAILED:          { code: 'REPORT_002', message: '리포트 발송 실패' },
    SEND_MONTHLY_FAILED:  { code: 'REPORT_003', message: '리포트 전송 실패' },
    TEST_SEND_FAILED:     { code: 'REPORT_004', message: '테스트 발송 실패' },
    INVALID_MONTH:        { code: 'REPORT_005', message: '올바른 월 형식이 아닙니다. (YYYY-MM)' },
    NOT_FOUND:            { code: 'REPORT_100', message: '리포트를 찾을 수 없습니다.' },
    FILE_NOT_FOUND:       { code: 'REPORT_101', message: '리포트 파일이 존재하지 않습니다.' },
    DATA_FETCH_FAILED:    { code: 'REPORT_500', message: '리포트 데이터 조회 실패' },
    SERVER_ERROR:         { code: 'REPORT_501', message: '리포트 처리 중 오류가 발생했습니다.' },
  },

  // ── PDF (PDF) ─────────────────────────────────────────────────────────────
  PDF: {
    NO_CONTENT:           { code: 'PDF_001', message: 'HTML 내용이 없습니다.' },
    GENERATE_FAILED:      { code: 'PDF_500', message: 'PDF 생성 실패' },
    SEND_FAILED:          { code: 'PDF_501', message: 'PDF 이메일 발송 실패' },
  },

  // ── 이메일 (EMAIL) ────────────────────────────────────────────────────────
  EMAIL: {
    REQUIRED:             { code: 'EMAIL_001', message: '이메일 주소를 입력하세요.' },
    INVALID_FORMAT:       { code: 'EMAIL_002', message: '올바른 이메일 형식이 아닙니다.' },
    SEND_FAILED:          { code: 'EMAIL_500', message: '이메일 발송 실패' },
  },

  // ── AI 분석 (AI) ──────────────────────────────────────────────────────────
  AI: {
    API_KEY_MISSING:      { code: 'AI_001', message: 'AI API 키가 설정되지 않았습니다.' },
    INVALID_INPUT:        { code: 'AI_002', message: '분석에 필요한 데이터가 없습니다.' },
    NO_DATA:              { code: 'AI_100', message: '분석할 광고 데이터가 없습니다.' },
    GENERATE_FAILED:      { code: 'AI_500', message: 'AI 분석 생성 중 오류가 발생했습니다.' },
    SERVER_ERROR:         { code: 'AI_501', message: 'AI 처리 중 오류가 발생했습니다.' },
  },

  // ── AI 소재 (CREATIVE) ────────────────────────────────────────────────────
  CREATIVE: {
    MISSING_FIELDS:       { code: 'CRE_001', message: '업종, 상품명, 타겟 고객, 톤앤매너, 광고 목적은 필수입니다.' },
    INVALID_FILE_TYPE:    { code: 'CRE_002', message: '지원하지 않는 파일 형식입니다.' },
    INVALID_ID:           { code: 'CRE_003', message: '올바르지 않은 소재 ID입니다.' },
    NOT_FOUND:            { code: 'CRE_100', message: '소재 생성 결과를 찾을 수 없습니다.' },
    GENERATE_FAILED:      { code: 'CRE_500', message: '소재 생성 중 오류가 발생했습니다.' },
    HISTORY_FAILED:       { code: 'CRE_501', message: '소재 이력 조회 중 오류가 발생했습니다.' },
    DELETE_FAILED:        { code: 'CRE_502', message: '소재 이력 삭제 중 오류가 발생했습니다.' },
    DETAIL_FAILED:        { code: 'CRE_503', message: '소재 상세 조회 중 오류가 발생했습니다.' },
  },

  // ── 광고 계정 (ACCOUNT) ───────────────────────────────────────────────────
  ACCOUNT: {
    INVALID_INPUT:        { code: 'ACC_001', message: '광고 계정 입력값이 올바르지 않습니다.' },
    NOT_FOUND:            { code: 'ACC_100', message: '광고 계정을 찾을 수 없습니다.' },
    SERVER_ERROR:         { code: 'ACC_500', message: '광고 계정 처리 중 오류가 발생했습니다.' },
  },

  // ── 캠페인 (CAMPAIGN) ─────────────────────────────────────────────────────
  CAMPAIGN: {
    INVALID_INPUT:        { code: 'CMP_001', message: '캠페인 입력값이 올바르지 않습니다.' },
    NOT_FOUND:            { code: 'CMP_100', message: '캠페인을 찾을 수 없습니다.' },
    SERVER_ERROR:         { code: 'CMP_500', message: '캠페인 처리 중 오류가 발생했습니다.' },
  },

  // ── 예산 (BUDGET) ─────────────────────────────────────────────────────────
  BUDGET: {
    INVALID_AMOUNT:       { code: 'BDG_001', message: '올바르지 않은 예산 금액입니다.' },
    EXCEED_LIMIT:         { code: 'BDG_002', message: '예산 한도를 초과했습니다.' },
    SERVER_ERROR:         { code: 'BDG_500', message: '예산 처리 중 오류가 발생했습니다.' },
  },

  // ── 결제 (PAYMENT) ────────────────────────────────────────────────────────
  PAYMENT: {
    INVALID_INPUT:        { code: 'PAY_001', message: '결제 정보가 올바르지 않습니다.' },
    NOT_FOUND:            { code: 'PAY_100', message: '결제 정보를 찾을 수 없습니다.' },
    FAILED:               { code: 'PAY_500', message: '결제 처리 중 오류가 발생했습니다.' },
  },

  // ── 인사이트 (INSIGHT) ────────────────────────────────────────────────────
  INSIGHT: {
    INVALID_INPUT:        { code: 'INS_001', message: '인사이트 요청값이 올바르지 않습니다.' },
    NOT_FOUND:            { code: 'INS_100', message: '인사이트 데이터를 찾을 수 없습니다.' },
    GENERATE_FAILED:      { code: 'INS_500', message: '인사이트 생성 중 오류가 발생했습니다.' },
    SERVER_ERROR:         { code: 'INS_501', message: '인사이트 처리 중 오류가 발생했습니다.' },
  },

  // ── 대시보드 (DASHBOARD) ──────────────────────────────────────────────────
  DASHBOARD: {
    SERVER_ERROR:         { code: 'DSH_500', message: '대시보드 데이터 조회 중 오류가 발생했습니다.' },
  },

  // ── 공통 (COMMON) ─────────────────────────────────────────────────────────
  COMMON: {
    INVALID_INPUT:        { code: 'CMN_001', message: '입력값이 올바르지 않습니다.' },
    UNAUTHORIZED:         { code: 'CMN_401', message: '인증이 필요합니다.' },
    FORBIDDEN:            { code: 'CMN_403', message: '접근 권한이 없습니다.' },
    NOT_FOUND:            { code: 'CMN_404', message: '요청한 리소스를 찾을 수 없습니다.' },
    SERVER_ERROR:         { code: 'CMN_500', message: '서버 오류가 발생했습니다.' },
  },

} as const;

// ── 헬퍼 타입 ────────────────────────────────────────────────────────────────
type ErrorDef = { code: string; message: string };

/**
 * 에러 응답 객체 생성
 * @example
 * res.status(400).json(createErrorResponse(ERROR_CODES.EMAIL.REQUIRED));
 * res.status(500).json(createErrorResponse(ERROR_CODES.PDF.GENERATE_FAILED, error.message));
 */
export const createErrorResponse = (err: ErrorDef, detail?: string) => ({
  success: false,
  code: err.code,
  message: err.message,
  ...(detail ? { detail } : {}),
});
