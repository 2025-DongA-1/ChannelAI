import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../pages/RegisterPage';

// ── 모킹 ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/lib/api', () => ({
  authAPI: {
    checkEmail: vi.fn(),
    register: vi.fn(),
  },
}));

import { authAPI } from '@/lib/api';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

const renderRegister = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );

/** 공통: 폼 전체 정상 입력 (이메일 중복확인 포함) */
const fillValidForm = async () => {
  vi.mocked(authAPI.checkEmail).mockResolvedValue({
    data: { available: true, message: '사용 가능한 이메일입니다.' },
  } as any);

  fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '홍길동', name: 'name' } });
  fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: 'new@test.com', name: 'email' } });
  fireEvent.click(screen.getByRole('button', { name: '중복확인' }));
  await screen.findByText('사용 가능한 이메일입니다.');
  fireEvent.change(screen.getByLabelText(/^비밀번호 \*/), { target: { value: 'pass123', name: 'password' } });
  fireEvent.change(screen.getByLabelText(/비밀번호 확인/), { target: { value: 'pass123', name: 'confirmPassword' } });
};

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 케이스 1 ─ 렌더링
  it('1. 이름 / 이메일 / 중복확인 버튼 / 비밀번호 / 비밀번호 확인 / 회원가입 버튼 렌더링됨', () => {
    renderRegister();
    expect(screen.getByLabelText(/이름/)).toBeInTheDocument();
    expect(screen.getByLabelText(/이메일/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '중복확인' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^비밀번호 \*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호 확인/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회원가입' })).toBeInTheDocument();
  });

  // 케이스 2 ─ 비밀번호 불일치
  it('2. 비밀번호 불일치 상태에서 가입 클릭 → "비밀번호가 일치하지 않습니다." 표시, API 호출 없음', async () => {
    vi.mocked(authAPI.checkEmail).mockResolvedValue({
      data: { available: true, message: '사용 가능한 이메일입니다.' },
    } as any);

    renderRegister();
    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '홍길동', name: 'name' } });
    fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: 'new@test.com', name: 'email' } });
    // 이메일 중복확인
    fireEvent.click(screen.getByRole('button', { name: '중복확인' }));
    await screen.findByText('사용 가능한 이메일입니다.');
    fireEvent.change(screen.getByLabelText(/^비밀번호 \*/), { target: { value: 'pass123', name: 'password' } });
    fireEvent.change(screen.getByLabelText(/비밀번호 확인/), { target: { value: 'different', name: 'confirmPassword' } });
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => {
      expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument();
    });
    expect(authAPI.register).not.toHaveBeenCalled();
  });

  // 케이스 3 ─ 이메일 중복확인 미완료
  it('3. 이메일 중복확인 미완료 상태에서 가입 클릭 → "이메일 중복확인을 해주세요." 표시, API 호출 없음', async () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: '홍길동', name: 'name' } });
    fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: 'new@test.com', name: 'email' } });
    // 중복확인 버튼 클릭 안 함
    fireEvent.change(screen.getByLabelText(/^비밀번호 \*/), { target: { value: 'pass123', name: 'password' } });
    fireEvent.change(screen.getByLabelText(/비밀번호 확인/), { target: { value: 'pass123', name: 'confirmPassword' } });
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => {
      expect(screen.getByText('이메일 중복확인을 해주세요.')).toBeInTheDocument();
    });
    expect(authAPI.register).not.toHaveBeenCalled();
  });

  // 케이스 4 ─ 이메일 중복확인 → 사용 가능
  it('4. 중복확인 클릭 → 사용 가능한 이메일 → CheckCircle(초록) 메시지 표시', async () => {
    vi.mocked(authAPI.checkEmail).mockResolvedValue({
      data: { available: true, message: '사용 가능한 이메일입니다.' },
    } as any);

    renderRegister();
    fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: 'new@test.com', name: 'email' } });
    fireEvent.click(screen.getByRole('button', { name: '중복확인' }));

    await waitFor(() => {
      expect(authAPI.checkEmail).toHaveBeenCalledWith('new@test.com');
      expect(screen.getByText('사용 가능한 이메일입니다.')).toBeInTheDocument();
    });
    // 초록색 텍스트 확인
    const msg = screen.getByText('사용 가능한 이메일입니다.');
    expect(msg.closest('div')).toHaveClass('text-green-600');
  });

  // 케이스 5 ─ 이메일 중복확인 → 이미 사용 중
  it('5. 중복확인 클릭 → 이미 사용 중인 이메일 → XCircle(빨간) 메시지 표시', async () => {
    vi.mocked(authAPI.checkEmail).mockResolvedValue({
      data: { available: false, message: '이미 사용 중인 이메일입니다.' },
    } as any);

    renderRegister();
    fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: 'taken@test.com', name: 'email' } });
    fireEvent.click(screen.getByRole('button', { name: '중복확인' }));

    await waitFor(() => {
      expect(screen.getByText('이미 사용 중인 이메일입니다.')).toBeInTheDocument();
    });
    const msg = screen.getByText('이미 사용 중인 이메일입니다.');
    expect(msg.closest('div')).toHaveClass('text-red-600');
  });

  // 케이스 6 ─ 회원가입 API 호출 확인
  it('6. 모든 필드 정상 입력 후 회원가입 클릭 → authAPI.register() 호출됨, "가입 중..." 표시', async () => {
    vi.mocked(authAPI.register).mockReturnValue(new Promise(() => {})); // pending

    renderRegister();
    await fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => {
      expect(screen.getByText('가입 중...')).toBeInTheDocument();
    });
    expect(authAPI.register).toHaveBeenCalledWith(
      expect.objectContaining({ name: '홍길동', email: 'new@test.com', password: 'pass123' })
    );
  });

  // 케이스 7 ─ API 성공(201) → alert + /login 이동
  it('7. API 성공 → alert 표시 후 /login 으로 이동', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(authAPI.register).mockResolvedValue({ data: {} } as any);

    renderRegister();
    await fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
    alertSpy.mockRestore();
  });

  // 케이스 8 ─ API 실패(409) → 에러 메시지
  it('8. API 실패(409) → 에러 메시지 표시', async () => {
    vi.mocked(authAPI.register).mockRejectedValue({
      response: { data: { message: '이미 사용 중인 이메일입니다.' } },
    });

    renderRegister();
    await fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => {
      expect(screen.getAllByText('이미 사용 중인 이메일입니다.').length).toBeGreaterThan(0);
    });
  });

  // 케이스 9 ─ API 실패(500) → 에러, 버튼 재활성화
  it('9. API 실패(500) → 에러 메시지 표시, 회원가입 버튼 다시 활성화', async () => {
    vi.mocked(authAPI.register).mockRejectedValue({
      response: { data: { message: '서버 오류입니다.' } },
    });

    renderRegister();
    await fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => {
      expect(screen.getByText('서버 오류입니다.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '회원가입' })).not.toBeDisabled();
    });
  });
});
