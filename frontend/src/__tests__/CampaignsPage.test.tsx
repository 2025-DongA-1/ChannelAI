import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CampaignsPage from '../pages/CampaignsPage';

// ── 모킹 ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  campaignAPI: {
    getCampaigns: vi.fn(),
    deleteCampaign: vi.fn(),
  },
  budgetAPI: {
    updateTotalBudget: vi.fn(),
    getSummary: vi.fn(),
    getByPlatform: vi.fn(),
    getByCampaign: vi.fn(),
  },
}));

vi.mock('@/store/tutorialStore', () => ({
  useTutorialStore: vi.fn(() => ({
    isTutorialModeEnabled: false,
    pendingTour: null,
    consumeTour: vi.fn(),
    toggleTutorialMode: vi.fn(),
  })),
}));

vi.mock('@/lib/utils', () => ({
  formatCurrency: (v: number) => `₩${v}`,
  formatPercent: (v: number) => `${v}%`,
  getStatusColor: () => 'text-gray-600',
  getPlatformColor: () => '#000',
}));

import { campaignAPI, budgetAPI } from '@/lib/api';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = (client?: QueryClient) =>
  render(
    <QueryClientProvider client={client ?? createClient()}>
      <MemoryRouter>
        <CampaignsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

const mockCampaigns = [
  {
    id: 1,
    campaign_name: '메타 봄 캠페인',
    platform: 'meta',
    status: 'active',
    start_date: '2026-01-01',
    end_date: '2026-03-31',
    total_cost: 500000,
    total_revenue: 1500000,
    total_conversions: 50,
    total_clicks: 1000,
  },
  {
    id: 2,
    campaign_name: '구글 여름 캠페인',
    platform: 'google',
    status: 'paused',
    start_date: '2026-04-01',
    end_date: '2026-06-30',
    total_cost: 300000,
    total_revenue: 900000,
    total_conversions: 30,
    total_clicks: 600,
  },
];

const emptySummary = { data: { summary: { totalBudget: 0, totalSpent: 0, remaining: 0, dailyBudget: 0, activeCampaigns: 0, utilizationRate: 0 } } };
const emptyPlatforms = { data: { platforms: [] } };

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('CampaignsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(budgetAPI.getSummary).mockResolvedValue(emptySummary as any);
    vi.mocked(budgetAPI.getByPlatform).mockResolvedValue(emptyPlatforms as any);
  });

  // 케이스 1 ─ 로딩 스피너
  it('1. 데이터 로딩 중 → 스피너 표시', async () => {
    vi.mocked(campaignAPI.getCampaigns).mockReturnValue(new Promise(() => {}));

    renderPage();

    // 스피너가 animate-spin 클래스로 렌더링됨
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // 케이스 2 ─ 캠페인 없을 때
  it('2. 캠페인 없을 때 → "캠페인이 없습니다" 메시지 + 플랫폼 연동 버튼 표시', async () => {
    vi.mocked(campaignAPI.getCampaigns).mockResolvedValue({
      data: { campaigns: [] },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('캠페인이 없습니다')).toBeInTheDocument();
      expect(screen.getByText('플랫폼 연동하기')).toBeInTheDocument();
    });
  });

  // 케이스 3 ─ 캠페인 목록 렌더링
  it('3. 캠페인 목록 정상 조회 → 캠페인명 / 플랫폼 렌더링 확인', async () => {
    vi.mocked(campaignAPI.getCampaigns).mockResolvedValue({
      data: { campaigns: mockCampaigns },
    } as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('메타 봄 캠페인')).toBeInTheDocument();
      expect(screen.getByText('구글 여름 캠페인')).toBeInTheDocument();
    });
  });

  // 케이스 4 ─ 플랫폼 필터
  it('4. 플랫폼 필터 "meta" 선택 → meta 캠페인만 표시', async () => {
    vi.mocked(campaignAPI.getCampaigns).mockResolvedValue({
      data: { campaigns: mockCampaigns },
    } as any);

    renderPage();
    await screen.findByText('메타 봄 캠페인');

    // 플랫폼 select 변경
    const selects = screen.getAllByRole('combobox');
    // 첫 번째 select가 플랫폼 필터
    fireEvent.change(selects[0], { target: { value: 'meta' } });

    await waitFor(() => {
      expect(screen.getByText('메타 봄 캠페인')).toBeInTheDocument();
      expect(screen.queryByText('구글 여름 캠페인')).not.toBeInTheDocument();
    });
  });

  // 케이스 5 ─ 검색 필터
  it('5. 캠페인명 검색 input 입력 → 해당 캠페인만 표시', async () => {
    vi.mocked(campaignAPI.getCampaigns).mockResolvedValue({
      data: { campaigns: mockCampaigns },
    } as any);

    renderPage();
    await screen.findByText('메타 봄 캠페인');

    fireEvent.change(screen.getByPlaceholderText('캠페인 검색...'), {
      target: { value: '구글' },
    });

    await waitFor(() => {
      expect(screen.queryByText('메타 봄 캠페인')).not.toBeInTheDocument();
      expect(screen.getByText('구글 여름 캠페인')).toBeInTheDocument();
    });
  });

  // 케이스 6 ─ 예산 수정 모달 → budgetAPI 호출
  it('6. 전체 예산 수정 버튼 클릭 후 제출 → budgetAPI.updateTotalBudget() 호출됨', async () => {
    vi.mocked(campaignAPI.getCampaigns).mockResolvedValue({
      data: { campaigns: [] },
    } as any);
    vi.mocked(budgetAPI.updateTotalBudget).mockResolvedValue({ data: {} } as any);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderPage();
    await waitFor(() => screen.getByText('캠페인이 없습니다'));

    // "전체 예산" 카드의 Edit 버튼 찾기 (p 태그 옆 형제 버튼)
    const totalBudgetLabel = screen.getByText('전체 예산');
    const editBtn = totalBudgetLabel.closest('div')!.querySelector('button')!;
    fireEvent.click(editBtn);

    // 모달 "전체 예산 설정" 타이틀 확인
    await waitFor(() => {
      expect(screen.getByText('전체 예산 설정 💰')).toBeInTheDocument();
    });

    // "설정하기" 버튼 클릭
    fireEvent.click(screen.getByRole('button', { name: '설정하기' }));

    await waitFor(() => {
      expect(budgetAPI.updateTotalBudget).toHaveBeenCalled();
    });
    alertSpy.mockRestore();
  });

  // 케이스 7 ─ 삭제 버튼 → confirm 다이얼로그
  it('7. 삭제 버튼 클릭 → window.confirm() 호출됨', async () => {
    vi.mocked(campaignAPI.getCampaigns).mockResolvedValue({
      data: { campaigns: mockCampaigns },
    } as any);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderPage();
    await screen.findByText('메타 봄 캠페인');

    // Trash2 아이콘 버튼 클릭
    const deleteBtns = screen.getAllByRole('button').filter(
      (b) => b.querySelector('svg[data-testid="trash-icon"]') || b.title === '삭제'
    );
    // 더 간단하게: aria-label이나 text 없으므로 직접 fireEvent로 찾기
    // Trash2 버튼은 마지막 td의 버튼
    const allBtns = screen.getAllByRole('button');
    const trashBtn = allBtns.find((b) => b.innerHTML.includes('Trash'));
    if (trashBtn) fireEvent.click(trashBtn);
    else {
      // fallback: 삭제 관련 버튼 직접 찾기
      fireEvent.click(allBtns[allBtns.length - 1]);
    }

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  // 케이스 8 ─ 삭제 확인 → campaignAPI.deleteCampaign() 호출
  it('8. 삭제 확인 → campaignAPI.deleteCampaign(id) 호출됨', async () => {
    vi.mocked(campaignAPI.getCampaigns).mockResolvedValue({
      data: { campaigns: mockCampaigns },
    } as any);
    vi.mocked(campaignAPI.deleteCampaign).mockResolvedValue({ data: {} } as any);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderPage();
    await screen.findByText('메타 봄 캠페인');

    const allBtns = screen.getAllByRole('button');
    // 마지막 두 버튼이 삭제 버튼 (두 행)
    fireEvent.click(allBtns[allBtns.length - 2]);

    await waitFor(() => {
      expect(campaignAPI.deleteCampaign).toHaveBeenCalledWith(expect.any(Number));
    });
  });
});
