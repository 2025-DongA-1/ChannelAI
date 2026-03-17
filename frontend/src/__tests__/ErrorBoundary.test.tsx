import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

/** 의도적으로 에러를 throw 하는 컴포넌트 */
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('테스트 에러');
  return <div>정상 컨텐츠</div>;
};

// React는 에러 발생 시 console.error 출력 → 테스트 로그 오염 방지
const suppressConsoleError = () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  return spy;
};

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof suppressConsoleError>;

  beforeEach(() => {
    consoleSpy = suppressConsoleError();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // 케이스 1 ─ 정상 children 렌더링
  it('1. 정상 children → children 내용이 그대로 표시됨', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('정상 컨텐츠')).toBeInTheDocument();
    expect(screen.queryByText('문제가 발생했습니다.')).not.toBeInTheDocument();
  });

  // 케이스 2 ─ children에서 에러 발생 → 폴백 UI 표시
  it('2. children에서 에러 발생 → "문제가 발생했습니다." + "새로고침" 버튼 표시', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('문제가 발생했습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument();
    expect(screen.queryByText('정상 컨텐츠')).not.toBeInTheDocument();
  });

  // 케이스 3 ─ 새로고침 버튼 → window.location.reload() 호출
  it('3. "새로고침" 버튼 클릭 → window.location.reload() 호출됨', () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
    expect(reloadSpy).toHaveBeenCalledOnce();
  });
});
