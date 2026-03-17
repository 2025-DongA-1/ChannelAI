import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIRecommendationPage from '../pages/AIRecommendationPage';

// ── 모킹 ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from '@/lib/api';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

const createClient = () =>
  new QueryClient({ defaultOptions: { mutations: { retry: false } } });

const renderPage = (client?: QueryClient) =>
  render(
    <QueryClientProvider client={client ?? createClient()}>
      <AIRecommendationPage />
    </QueryClientProvider>
  );

const crossPlatformStrategy = {
  combination: ['meta', 'google'],
  combination_rationale: '메타+구글 조합이 효과적입니다.',
  execution_order: [
    { phase: 1, platform: 'meta', objective: '인지도 확보', duration: '2주', budget_ratio: 60 },
    { phase: 2, platform: 'google', objective: '전환 유도', duration: '2주', budget_ratio: 40 },
  ],
};

const mockHighConfidenceResult = {
  data: {
    data: {
      confidence: { level: 'high', score: 0.92, message: '높은 신뢰도입니다.' },
      recommended_platforms: {
        primary: { platform: 'meta', score: 0.85, reason: '이커머스 최적 플랫폼' },
        alternatives: [
          { platform: 'google', score: 0.75, reason: '검색 광고 효과적' },
        ],
      },
      performance_forecast: {
        meta: { roas: 4.5, clicks: 5000, conversions: 200 },
      },
      budget_allocation: {
        recommended_allocation: {
          meta: { percentage: 60, budget: 1800000, expected_return: 7200000 },
          google: { percentage: 40, budget: 1200000, expected_return: 4200000 },
        },
        expected_total_return: 11400000,
      },
      cross_platform_strategy: crossPlatformStrategy,
    },
  },
};

const mockMediumConfidenceResult = {
  data: {
    data: {
      confidence: { level: 'medium', score: 0.65, message: '중간 신뢰도입니다.' },
      recommended_platforms: {
        primary: { platform: 'naver', score: 0.7, reason: '국내 검색 강세' },
        alternatives: [],
      },
      performance_forecast: {
        naver: { roas: 3.0, clicks: 3000, conversions: 100 },
      },
      budget_allocation: {
        recommended_allocation: {
          naver: { percentage: 100, budget: 3000000, expected_return: 9000000 },
        },
        expected_total_return: 9000000,
      },
      cross_platform_strategy: {
        ...crossPlatformStrategy,
        combination: ['naver'],
        execution_order: [
          { phase: 1, platform: 'naver', objective: '인지도 확보', duration: '4주', budget_ratio: 100 },
        ],
      },
    },
  },
};

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('AIRecommendationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 케이스 1 ─ 렌더링
  it('1. 페이지 최초 렌더링 → 제품명 input / "AI 추천 받기" 버튼 표시', () => {
    renderPage();
    expect(screen.getByPlaceholderText('예: 수제 케이크 배달')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI 추천 받기/ })).toBeInTheDocument();
    expect(screen.getByText('AI 광고 최적화 추천')).toBeInTheDocument();
  });

  // 케이스 2 ─ 추천 클릭 → api.post('/ai/recommend') 호출됨
  it('2. 제품명 입력 후 추천 클릭 → api.post("/ai/recommend") 호출됨', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {})); // pending

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('예: 수제 케이크 배달'), {
      target: { value: '수제 케이크' },
    });
    fireEvent.click(screen.getByRole('button', { name: /AI 추천 받기/ }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/ai/recommend', expect.objectContaining({ name: '수제 케이크' }));
    });
  });

  // 케이스 3 ─ 로딩 중 표시
  it('3. 추천 버튼 클릭 후 응답 전 → "AI 분석 중..." + "AI가 최적의 전략을 분석 중입니다..." 표시', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {}));

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('예: 수제 케이크 배달'), {
      target: { value: '수제 케이크' },
    });
    fireEvent.click(screen.getByRole('button', { name: /AI 추천 받기/ }));

    await waitFor(() => {
      expect(screen.getByText('AI 분석 중...')).toBeInTheDocument();
      expect(screen.getByText('AI가 최적의 전략을 분석 중입니다...')).toBeInTheDocument();
    });
  });

  // 케이스 4 ─ 로딩 중 버튼 disabled
  it('4. 추천 요청 중 → 버튼 disabled 상태', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {}));

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('예: 수제 케이크 배달'), {
      target: { value: '수제 케이크' },
    });
    fireEvent.click(screen.getByRole('button', { name: /AI 추천 받기/ }));

    await waitFor(() => {
      const btn = screen.getByText('AI 분석 중...').closest('button');
      expect(btn).toBeDisabled();
    });
  });

  // 케이스 5 ─ API 성공(high) → 초록색 신뢰도 배지
  it('5. API 성공 — 신뢰도 high → 초록색 배지 + "높음" 텍스트 표시', async () => {
    vi.mocked(api.post).mockResolvedValue(mockHighConfidenceResult as any);

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('예: 수제 케이크 배달'), {
      target: { value: '수제 케이크' },
    });
    fireEvent.click(screen.getByRole('button', { name: /AI 추천 받기/ }));

    await waitFor(() => {
      expect(screen.getByText(/신뢰도.*높음/)).toBeInTheDocument();
    });
    // 초록색 배경 컨테이너 확인 (rounded-xl p-4 border-2 bg-green-50)
    const badge = screen.getByText(/신뢰도.*높음/).closest('[class*="rounded-xl"]');
    expect(badge).toHaveClass('bg-green-50');
  });

  // 케이스 6 ─ API 성공(medium) → 노란색 신뢰도 배지
  it('6. API 성공 — 신뢰도 medium → 노란색 배지 + "중간" 텍스트 표시', async () => {
    vi.mocked(api.post).mockResolvedValue(mockMediumConfidenceResult as any);

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('예: 수제 케이크 배달'), {
      target: { value: '수제 케이크' },
    });
    fireEvent.click(screen.getByRole('button', { name: /AI 추천 받기/ }));

    await waitFor(() => {
      expect(screen.getByText(/신뢰도.*중간/)).toBeInTheDocument();
    });
    const badge = screen.getByText(/신뢰도.*중간/).closest('[class*="rounded-xl"]');
    expect(badge).toHaveClass('bg-yellow-50');
  });

  // 케이스 7 ─ API 실패(500) → AlertCircle + 에러 박스 표시, 버튼 재활성화
  it('7. API 실패(500) → "추천 실패" 에러 박스 표시, 버튼 다시 활성화', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('서버 오류'));

    renderPage();
    fireEvent.change(screen.getByPlaceholderText('예: 수제 케이크 배달'), {
      target: { value: '수제 케이크' },
    });
    fireEvent.click(screen.getByRole('button', { name: /AI 추천 받기/ }));

    await waitFor(() => {
      expect(screen.getByText('추천 실패')).toBeInTheDocument();
    });
    // 에러 후 버튼 재활성화 확인
    expect(screen.getByRole('button', { name: /AI 추천 받기/ })).not.toBeDisabled();
  });
});
