import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';

// ── 모킹 ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/lib/api', () => ({
  authAPI: {
    login: vi.fn(),
    getKakaoAuthUrl: vi.fn(),
    getNaverAuthUrl: vi.fn(),
    getGoogleAuthUrl: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector: any) => {
    const state = { isAuthenticated: false, setAuth: vi.fn() };
    return selector(state);
  }),
}));

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: 미인증 상태
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { isAuthenticated: false, setAuth: vi.fn() };
      return selector(state);
    });
  });

  // 케이스 1 ─ 렌더링
  it('1. 이메일 input / 비밀번호 input / 로그인 버튼 / 소셜 버튼 모두 렌더링됨', () => {
    renderLogin();
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
    expect(screen.getByText('카카오로 계속하기')).toBeInTheDocument();
    expect(screen.getByText('네이버로 계속하기')).toBeInTheDocument();
    expect(screen.getByText('Google로 계속하기')).toBeInTheDocument();
  });

  // 케이스 2 ─ 이미 로그인 시 리다이렉트
  it('2. isAuthenticated=true 이면 /dashboard 로 즉시 이동', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { isAuthenticated: true, setAuth: vi.fn() };
      return selector(state);
    });
    renderLogin();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  // 케이스 3 ─ API 호출 확인
  it('3. 이메일·비밀번호 입력 후 로그인 → authAPI.login() 호출됨', async () => {
    vi.mocked(authAPI.login).mockResolvedValue({
      data: { token: 'test-token', user: { id: 1, email: 'test@test.com', name: '홍길동' } },
    } as any);

    renderLogin();
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'pass123' });
    });
  });

  // 케이스 4 ─ API 성공 → /dashboard 이동
  it('4. API 성공 → setAuth() 호출, /dashboard 이동', async () => {
    const mockSetAuth = vi.fn();
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { isAuthenticated: false, setAuth: mockSetAuth };
      return selector(state);
    });
    vi.mocked(authAPI.login).mockResolvedValue({
      data: { token: 'abc', user: { id: 1, email: 'test@test.com', name: '홍길동' } },
    } as any);

    renderLogin();
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  // 케이스 5 ─ API 실패(401) → 에러 메시지
  it('5. API 실패(401) → 에러 메시지 표시', async () => {
    vi.mocked(authAPI.login).mockRejectedValue({
      response: { data: { message: '이메일 또는 비밀번호가 올바르지 않습니다.' } },
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'wrong@test.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(screen.getByText('이메일 또는 비밀번호가 올바르지 않습니다.')).toBeInTheDocument();
    });
  });

  // 케이스 6 ─ API 실패(500) → 에러 메시지, 버튼 재활성화
  it('6. API 실패(500) → 에러 메시지 표시, 로그인 버튼 다시 활성화', async () => {
    vi.mocked(authAPI.login).mockRejectedValue({
      response: { data: { message: '서버 오류입니다.' } },
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(screen.getByText('서버 오류입니다.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '로그인' })).not.toBeDisabled();
    });
  });

  // 케이스 7 ─ 로딩 중 버튼 상태
  it('7. 로그인 클릭 후 API 응답 전 → 버튼 disabled + "로그인 중..." 표시', async () => {
    vi.mocked(authAPI.login).mockReturnValue(new Promise(() => {})); // 영원히 pending

    renderLogin();
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(screen.getByText('로그인 중...')).toBeInTheDocument();
    });
    // submit 버튼은 disabled (type="submit" + disabled prop)
    const submitBtn = screen.getByText('로그인 중...').closest('button');
    expect(submitBtn).toBeDisabled();
  });

  // 케이스 8 ─ 카카오 소셜 로그인
  it('8. 카카오 버튼 클릭 → authAPI.getKakaoAuthUrl() 호출됨', async () => {
    vi.mocked(authAPI.getKakaoAuthUrl).mockResolvedValue({
      data: { authUrl: 'https://kakao.com/auth' },
    } as any);
    // window.location.href 할당은 jsdom에서 에러 날 수 있으므로 spy
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderLogin();
    fireEvent.click(screen.getByText('카카오로 계속하기'));

    await waitFor(() => {
      expect(authAPI.getKakaoAuthUrl).toHaveBeenCalled();
    });
  });
});
