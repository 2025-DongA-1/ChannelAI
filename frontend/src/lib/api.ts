// Axios 라이브러리 import (HTTP 클라이언트)
import axios from 'axios';

// 환경변수에서 API 기본 URL 가져오기 (없으면 기본값 '/api/v1' 사용)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Axios 인스턴스 생성 및 기본 설정
export const api = axios.create({
  baseURL: API_BASE_URL, // 모든 요청의 기본 URL
  headers: {
    'Content-Type': 'application/json', // JSON 형식의 데이터 전송
  },
});

// ✅ Request 인터셉터: 모든 요청 전에 JWT 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    // localStorage에서 저장된 토큰 가져오기
    const token = localStorage.getItem('token');
    // 토큰이 있을 경우 Authorization 헤더에 Bearer 토큰 추가
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 설정된 config 반환
    return config;
  },
  // 요청 설정 오류 시 에러 반환
  (error) => Promise.reject(error)
);

// ✅ Response 인터셉터: 응답 에러 처리
api.interceptors.response.use(
  // 성공 응답은 그대로 반환
  (response) => response,
  (error) => {
    // 상태 코드가 401(인증 실패)이면 토큰과 사용자 정보 삭제
    if (error.response?.status === 401) {
      // localStorage에서 토큰 제거
      localStorage.removeItem('token');
      // localStorage에서 사용자 정보 제거
      localStorage.removeItem('user');
      // Zustand persist store도 초기화 (상태 관리 라이브러리 데이터 제거)
      localStorage.removeItem('auth-storage');
      // 무한 루프 방지: 현재 페이지가 로그인 페이지가 아닐 때만 리다이렉트
      if (!window.location.pathname.includes('/login')) {
        // 사용자를 로그인 페이지로 이동
        window.location.href = '/login';
      }
    }
    // 에러를 Promise로 반환 (호출부에서 catch로 처리 가능)
    return Promise.reject(error);
  }
);

// 🔐 인증 관련 API 함수 모음
export const authAPI = {
  // 이메일 중복 확인 요청
  checkEmail: (email: string) =>
    api.get('/auth/check-email', { params: { email } }),
  
  // 회원가입 요청 (이름, 이메일, 비밀번호, 회사명 필요)
  register: (data: { name: string; email: string; password: string; company: string }) =>
    api.post('/auth/register', data),
  
  // 로그인 요청 (이메일, 비밀번호)
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  // 현재 로그인한 사용자 정보 조회
  getMe: () => api.get('/auth/me'),
  
  // 🔗 소셜 로그인 인증 URL 가져오기
  // 카카오 로그인 URL 조회
  getKakaoAuthUrl: () => api.get('/auth/kakao'),
  // 네이버 로그인 URL 조회
  getNaverAuthUrl: () => api.get('/auth/naver'),
  // 구글 로그인 URL 조회
  getGoogleAuthUrl: () => api.get('/auth/google'),

  // 🔗 소셜 계정 연동 (MyPage에서 사용하는 함수) 
  // Authorization 헤더를 빈 문자열로 설정해 401 에러 방지
  // 카카오 계정 연동 요청
  connectKakao: () => api.get('/auth/kakao', { headers: { Authorization: '' } }),
  // 네이버 계정 연동 요청
  connectNaver: () => api.get('/auth/naver', { headers: { Authorization: '' } }),
  // 구글 계정 연동 요청
  connectGoogle: () => api.get('/auth/google', { headers: { Authorization: '' } }),

  // ✏️ 프로필 수정 (이름, 이메일, 회사명, 사업자번호, 전화번호)
  updateProfile: (data: {
    name?: string;
    email?: string;
    company_name?: string;
    business_number?: string;
    phone_number?: string;
  }) => api.put('/auth/me', data),

  // 🔑 비밀번호 변경
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/me/password', data),
};

// 📊 대시보드 관련 API 함수 모음
export const dashboardAPI = {
  // 대시보드 요약 정보 조회 (선택: 시작일, 종료일 파라미터)
  getSummary: (params?: { startDate?: string; endDate?: string }) => 
    api.get('/dashboard/summary', { params }),
  
  // 채널별 성과 데이터 조회 (플랫폼별 수치)
  getChannelPerformance: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/dashboard/channel-performance', { params }),
  
  // 대시보드 인사이트 조회 (필터: 개수 제한, 우선순위)
  getInsights: (params?: { limit?: number; priority?: string }) =>
    api.get('/dashboard/insights', { params }),
  
  // 예산 정보 조회 (플랫폼별 또는 캠페인별로 그룹화)
  getBudget: (params?: { groupBy?: 'platform' | 'campaign' }) =>
    api.get('/dashboard/budget', { params }),

  // AI 모델 불러오기 - DH
  getAiHistory: (userId: number) => axios.get(`/api/v1/ai/history/${userId}`).then(res => res.data),

  // 이전 분석 불러오기 - DH
  getAiReportDetail: (id: number) => axios.get(`/api/v1/ai/report/${id}`).then(res => res.data),
};

// 📢 캠페인 관련 API 함수 모음
export const campaignAPI = {
  // 캠페인 리스트 조회 (페이지네이션, 플랫폼, 상태 필터 가능)
  getCampaigns: (params?: { page?: number; limit?: number; platform?: string; status?: string }) =>
    api.get('/campaigns', { params }),
  
  // 특정 캠페인 상세 정보 조회 (캠페인 ID 필요)
  getCampaign: (id: number) => api.get(`/campaigns/${id}`),
  
  // 새로운 캠페인 생성 (데이터 객체 필요)
  createCampaign: (data: any) => api.post('/campaigns', data),
  
  // 기존 캠페인 정보 수정 (캠페인 ID, 수정할 데이터 필요)
  updateCampaign: (id: number, data: any) => api.put(`/campaigns/${id}`, data),
  
  // 캠페인 삭제 (캠페인 ID 필요)
  deleteCampaign: (id: number) => api.delete(`/campaigns/${id}`),
  
  // 👇 특정 캠페인의 성과 지표 조회 (캠페인 ID, 그리고 날짜 파라미터도 받도록 수정!)
  getMetrics: (id: number, params?: { startDate?: string; endDate?: string }) => 
    api.get(`/campaigns/${id}/metrics`, { params }),
};

// 🔑 광고 계정 관련 API 함수 모음
export const accountAPI = {
  // 광고 계정 리스트 조회 (플랫폼 필터 가능: Google, Meta, Naver 등)
  getAccounts: (params?: { platform?: string }) =>
    api.get('/accounts', { params }),
  
  // 특정 광고 계정 상세 정보 조회 (계정 ID 필요)
  getAccount: (id: number) => api.get(`/accounts/${id}`),
  
  // 새로운 광고 계정 등록 (계정 정보 데이터 필요)
  createAccount: (data: any) => api.post('/accounts', data),
  
  // 광고 계정 정보 수정 (계정 ID, 수정 데이터 필요)
  updateAccount: (id: number, data: any) => api.put(`/accounts/${id}`, data),
  
  // 광고 계정 삭제 (계정 ID 필요)
  deleteAccount: (id: number) => api.delete(`/accounts/${id}`),
};

// 🔗 플랫폼 연동 관련 API 함수 모음
export const integrationAPI = {
  // 플랫폼별 인증 URL 가져오기 (OAuth 로그인 시작)
  getAuthUrl: (platform: string) => api.get(`/integration/auth/${platform}`),
  
  // 🔐 API 키 기반 플랫폼 연동 (네이버 같이 OAuth 미지원 플랫폼용)
  // 플랫폼명, API 키, Secret 키, 고객ID, 계정명 필요
  connectPlatform: (platform: string, data: {
    apiKey: string; // 플랫폼의 API 키
    secretKey: string; // 플랫폼의 Secret 키
    customerId: string; // 플랫폼의 고객 ID
    accountName?: string; // 선택: 계정 별명
  }) => api.post(`/integration/connect/${platform}`, data),

  // 특정 광고 계정의 캠페인 정보 동기화 (계정 ID 필요)
  syncCampaigns: (accountId: number) =>
    api.post(`/integration/sync/campaigns/${accountId}`),
  
  // 특정 캠페인의 성과 지표 동기화 (캠페인 ID, 시작일, 종료일 필요)
  syncMetrics: (campaignId: number, data: { startDate: string; endDate: string }) =>
    api.post(`/integration/sync/metrics/${campaignId}`, data),
  
  // 모든 연동된 플랫폼의 데이터 한 번에 동기화 (시작일, 종료일, 플랫폼 선택)
  syncAll: (data: { startDate: string; endDate: string; platform?: string }) =>
    api.post('/integration/sync/all', data),

  // 특정 플랫폼 연동 해제 (플랫폼명 필요)
  disconnect: (platform: string) =>
    api.delete(`/integration/disconnect/${platform}`),

  // 🥕 당근마켓 광고 데이터 연동 (크롤링)
  // adUrl: 광고 결과 페이지 URL, sessionCookie: 사용자의 세션 쿠키
  connectKarrot: (adUrl: string, sessionCookie: string) =>
    api.post('/integration/karrot', { adUrl, sessionCookie }),

  // 🥕 당근마켓 광고 데이터 수동 입력
  submitKarrotManual: (data: {
    campaignName: string;
    subject: string;
    startDate: string;
    endDate: string;
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    cost: number;
    cpc: number;
    revenue?: number;
  }) => api.post('/integration/karrot/manual', data),

  // 🥕 당근마켓 수동 입력 캠페인 삭제
  deleteKarrotManualCampaign: (campaignId: number) =>
    api.delete(`/integration/karrot/manual/${campaignId}`),

  // 🥕 당근마켓 수동 입력 캠페인 수정
  updateKarrotManualCampaign: (campaignId: number, data: {
    campaignName: string;
    subject: string;
    startDate: string;
    endDate: string;
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    cost: number;
    cpc: number;
    revenue?: number;
  }) => api.put(`/integration/karrot/manual/${campaignId}`, data),

  // 📤 CSV 파일 업로드 (File 객체 필요)
  uploadCSV: (file: File) => {
    // FormData 생성 (파일 업로드용)
    const formData = new FormData();
    // FormData에 파일 추가
    formData.append('file', file);
    // multipart/form-data 형식으로 POST 요청
    return api.post('/integration/upload/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // 파일 업로드 시 필수
      },
    });
  },

  // 📥 CSV 파일 다운로드 (Blob 형식으로 받음)
  exportCSV: () =>
    api.get('/integration/export/csv', { responseType: 'blob' }), // blob: 바이너리 파일 데이터
};

// 💰 예산 관련 API 함수 모음
export const budgetAPI = {
  // 예산 요약 정보 조회 (시작일, 종료일 필터 가능)
  // 전체 예산(totalBudget)과 일일 예산(dailyBudget)을 모두 전송하도록 수정합니다.
  updateTotalBudget: (data: { totalBudget: number; dailyBudget: number }) => 
    api.post('/budget/settings', data),
  getSummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/budget/summary', { params }),
  
  // 플랫폼별 예산 현황 조회 (플랫폼별로 집계된 데이터)
  getByPlatform: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/budget/by-platform', { params }),
  
  // 캠페인별 예산 현황 조회 (캠페인별로 집계된 데이터)
  getByCampaign: (params?: { platform?: string; startDate?: string; endDate?: string }) =>
    api.get('/budget/by-campaign', { params }),
  
  // 특정 캠페인의 예산 정보 수정 (캠페인 ID, 일일/전체 예산 필요)
  updateCampaignBudget: (id: number, data: { dailyBudget?: number; totalBudget?: number }) =>
    api.put(`/budget/campaign/${id}`, data),
};

// 🤖 AI 마케팅 에이전트 관련 API 함수 모음
export const aiAgentAPI = {
  // AI 에이전트 상태 확인 (모델 로드 여부 등)
  getStatus: () => api.get('/ai/agent/status'),
  // AI 에이전트 분석 실행 (전체 예산, 분석 기간 필요)
  analyze: (data: { totalBudget?: number; period?: number }) =>
    api.post('/ai/agent/analyze', data),
};

// 💡 인사이트 관련 API 함수 모음
export const insightsAPI = {
  // 광고 성과 트렌드 조회 (시작일, 종료일, 기간 필터 가능)
  getTrends: (params?: { start_date?: string; end_date?: string; period?: string; campaign_id?: string }) =>
    api.get('/insights/trends', { params }),
  
  // 플랫폼 간 성과 비교 (시작일, 종료일 범위 내 비교 데이터)
  getComparison: (params?: { start_date?: string; end_date?: string; campaign_id?: string }) =>
    api.get('/insights/comparison', { params }),
  
  // 💡 [수정됨] AI 기반 추천사항 조회 (캠페인 ID 파라미터 추가)
  getRecommendations: (params?: { campaign_id?: string }) =>
    api.get('/insights/recommendations', { params }),
};

// 📊 원본 메트릭 데이터 조회 및 관리 API
export const metricAPI = {
  // 전체 메트릭 조회
  getAllMetrics: () => api.get('/metrics'),
  
  // 메트릭 수정
  updateMetric: (id: number, data: any) => api.put(`/metrics/${id}`, data),
  
  // 메트릭 삭제
  deleteMetric: (id: number) => api.delete(`/metrics/${id}`),

  // 다수 메트릭 일괄 삭제
  deleteBulkMetrics: (ids: number[]) => api.post('/metrics/bulk-delete', { ids }),
};
