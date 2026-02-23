import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 인증 실패 시 로그인 페이지로 리다이렉트
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  checkEmail: (email: string) =>
    api.get('/auth/check-email', { params: { email } }),
  
  register: (data: { name: string; email: string; password: string; company: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  getMe: () => api.get('/auth/me'),
  
  // 소셜 로그인 (URL 가져오기)
  getKakaoAuthUrl: () => api.get('/auth/kakao'),
  getNaverAuthUrl: () => api.get('/auth/naver'),
  getGoogleAuthUrl: () => api.get('/auth/google'),

  // 소셜 연동 (MyPage에서 사용하는 이름) - 토큰 없이 요청 (401 방지)
  connectKakao: () => api.get('/auth/kakao', { headers: { Authorization: '' } }),
  connectNaver: () => api.get('/auth/naver', { headers: { Authorization: '' } }),
  connectGoogle: () => api.get('/auth/google', { headers: { Authorization: '' } }),
};

// Dashboard API
export const dashboardAPI = {
  getSummary: (params?: { startDate?: string; endDate?: string }) => 
    api.get('/dashboard/summary', { params }),
  
  getChannelPerformance: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/dashboard/channel-performance', { params }),
  
  getInsights: (params?: { limit?: number; priority?: string }) =>
    api.get('/dashboard/insights', { params }),
  
  getBudget: (params?: { groupBy?: 'platform' | 'campaign' }) =>
    api.get('/dashboard/budget', { params }),
};

// Campaign API
export const campaignAPI = {
  getCampaigns: (params?: { page?: number; limit?: number; platform?: string; status?: string }) =>
    api.get('/campaigns', { params }),
  
  getCampaign: (id: number) => api.get(`/campaigns/${id}`),
  
  createCampaign: (data: any) => api.post('/campaigns', data),
  
  updateCampaign: (id: number, data: any) => api.put(`/campaigns/${id}`, data),
  
  deleteCampaign: (id: number) => api.delete(`/campaigns/${id}`),
  
  getMetrics: (id: number) => api.get(`/campaigns/${id}/metrics`),
};

// Account API
export const accountAPI = {
  getAccounts: (params?: { platform?: string }) =>
    api.get('/accounts', { params }),
  
  getAccount: (id: number) => api.get(`/accounts/${id}`),
  
  createAccount: (data: any) => api.post('/accounts', data),
  
  updateAccount: (id: number, data: any) => api.put(`/accounts/${id}`, data),
  
  deleteAccount: (id: number) => api.delete(`/accounts/${id}`),
};

// Integration API
export const integrationAPI = {
  getAuthUrl: (platform: string) => api.get(`/integration/auth/${platform}`),
  
  // API 키 기반 연동 (네이버 등)
  connectPlatform: (platform: string, data: {
    apiKey: string;
    secretKey: string;
    customerId: string;
    accountName?: string;
  }) => api.post(`/integration/connect/${platform}`, data),

  syncCampaigns: (accountId: number) =>
    api.post(`/integration/sync/campaigns/${accountId}`),
  
  syncMetrics: (campaignId: number, data: { startDate: string; endDate: string }) =>
    api.post(`/integration/sync/metrics/${campaignId}`, data),
  
  syncAll: (data: { startDate: string; endDate: string; platform?: string }) =>
    api.post('/integration/sync/all', data),

  disconnect: (platform: string) =>
    api.delete(`/integration/disconnect/${platform}`),

  uploadCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/integration/upload/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Budget API
export const budgetAPI = {
  getSummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/budget/summary', { params }),
  
  getByPlatform: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/budget/by-platform', { params }),
  
  getByCampaign: (params?: { platform?: string; startDate?: string; endDate?: string }) =>
    api.get('/budget/by-campaign', { params }),
  
  updateCampaignBudget: (id: number, data: { dailyBudget?: number; totalBudget?: number }) =>
    api.put(`/budget/campaign/${id}`, data),
};

// AI Marketing Agent API
export const aiAgentAPI = {
  getStatus: () => api.get('/ai/agent/status'),
  analyze: (data: { totalBudget?: number; period?: number }) =>
    api.post('/ai/agent/analyze', data),
};

// Insights API
export const insightsAPI = {
  getTrends: (params?: { start_date?: string; end_date?: string; period?: string }) =>
    api.get('/insights/trends', { params }),
  
  getComparison: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/insights/comparison', { params }),
  
  getRecommendations: () =>
    api.get('/insights/recommendations'),
};
