import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../pages/DashboardPage';

// ── 모킹 ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  dashboardAPI: {
    getSummary: vi.fn(),
    getChannelPerformance: vi.fn(),
    getInsights: vi.fn(),
    getBudget: vi.fn(),
    getAiHistory: vi.fn(),
    getAiReportDetail: vi.fn(),
  },
  campaignAPI: {
    getCampaigns: vi.fn(),
    getMetrics: vi.fn(),
  },
  aiAgentAPI: {
    getStatus: vi.fn(),
    analyze: vi.fn(),
  },
}));

vi.mock('@/store/tutorialStore', () => ({
  useTutorialStore: vi.fn(() => ({
    isTutorialModeEnabled: false,
    toggleTutorialMode: vi.fn(),
    pendingTour: null,
    consumeTour: vi.fn(),
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/lib/utils', () => ({
  formatCurrency: (v: number) => `₩${v}`,
  formatPercent: (v: number) => `${v}%`,
  formatCompactNumber: (v: number) => `${v}`,
  getComparisonText: () => '이전 기간 대비',
  getPreviousDateRange: () => null,
  calculateChangeRate: () => 0,
}));

import { dashboardAPI, campaignAPI } from '@/lib/api';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = (client?: QueryClient) =>
  render(
    <QueryClientProvider client={client ?? createClient()}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

// DashboardPage: summary?.data?.metrics / summary?.data?.budget 구조
const emptyDataResponse = {
  data: {
    metrics: { cost: 0, roas: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0, ctr: 0, cpc: 0, cpa: 0 },
    budget: { total: 0, spent: 0, remaining: 0, utilizationRate: 0, activeCampaigns: 0, dailyBudget: 0 },
    topCampaigns: [],
    insights: [],
    platformBreakdown: [],
    aiRecommendations: [],
  },
};

const normalDataResponse = {
  data: {
    metrics: { cost: 500000, roas: 400, clicks: 5000, impressions: 100000, conversions: 200, revenue: 2000000, ctr: 5, cpc: 100, cpa: 2500 },
    budget: { total: 3000000, spent: 500000, remaining: 2500000, utilizationRate: 16.7, activeCampaigns: 3, dailyBudget: 100000 },
    topCampaigns: [],
    insights: [],
    platformBreakdown: [],
    aiRecommendations: [],
  },
};

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(campaignAPI.getCampaigns).mockResolvedValue({ data: { campaigns: [] } } as any);
    vi.mocked(dashboardAPI.getChannelPerformance).mockResolvedValue({ data: { channels: [] } } as any);
  });

  // 케이스 1 ─ 로딩 스피너 (isLoading=true → 스피너만 렌더링)
  it('1. 데이터 로딩 중 → 스피너만 표시됨 (페이지 조기 반환)', async () => {
    vi.mocked(dashboardAPI.getSummary).mockReturnValue(new Promise(() => {})); // 영원히 pending

    renderPage();
    // isLoading=true 이면 DashboardPage는 타이틀 없이 스피너만 렌더링
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
    // 로딩 중엔 페이지 타이틀이 표시되지 않음
    expect(screen.queryByText('통합 성과 대시보드')).not.toBeInTheDocument();
  });

  // 케이스 2 ─ 데이터 없을 때 기본값 표시 (크래시 없음)
  it('2. 데이터 없을 때 → 크래시 없이 기본값(₩0) 표시', async () => {
    vi.mocked(dashboardAPI.getSummary).mockResolvedValue(emptyDataResponse as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('통합 성과 대시보드')).toBeInTheDocument();
    });
    // 비용 0으로 렌더링
    const zeroValues = screen.getAllByText('₩0');
    expect(zeroValues.length).toBeGreaterThan(0);
  });

  // 케이스 3 ─ 정상 데이터 → 총 비용 렌더링
  it('3. 정상 데이터 → 총 광고비(₩500000) 수치 렌더링됨', async () => {
    vi.mocked(dashboardAPI.getSummary).mockResolvedValue(normalDataResponse as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('통합 성과 대시보드')).toBeInTheDocument();
    });
    // formatCurrency mock: ₩500000 (여러 곳에 표시될 수 있음)
    const costValues = screen.getAllByText('₩500000');
    expect(costValues.length).toBeGreaterThan(0);
  });

  // 케이스 4 ─ 날짜 필터 변경 → API 재호출
  it('4. 날짜 프리셋 버튼 클릭 시 dashboardAPI.getSummary 재호출됨', async () => {
    vi.mocked(dashboardAPI.getSummary).mockResolvedValue(emptyDataResponse as any);

    renderPage();
    await waitFor(() => screen.getByText('통합 성과 대시보드'));

    const callCountBefore = vi.mocked(dashboardAPI.getSummary).mock.calls.length;

    // "7일" 프리셋 버튼 클릭
    const sevenDayBtn = screen.getByRole('button', { name: '7일' });
    fireEvent.click(sevenDayBtn);

    await waitFor(() => {
      expect(vi.mocked(dashboardAPI.getSummary).mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });

  // 케이스 5 ─ 탭 전환
  it('5. "캠페인별 성과" 탭 클릭 → 탭 활성화 전환', async () => {
    vi.mocked(dashboardAPI.getSummary).mockResolvedValue(emptyDataResponse as any);

    renderPage();
    await waitFor(() => screen.getByText('전체 성과'));

    // "캠페인별 성과" 탭 클릭
    fireEvent.click(screen.getByText('캠페인별 성과'));

    await waitFor(() => {
      const campaignTab = screen.getByText('캠페인별 성과');
      expect(campaignTab).toHaveClass('text-blue-600');
    });
  });
});
