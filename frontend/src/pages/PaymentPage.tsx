import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../lib/api';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { user, token, setAuth } = useAuthStore();
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setSubscribing(true);
    setError(null);
    try {
      await authAPI.activateSubscription(1);
      if (user && token) {
        setAuth({ ...user, plan: 'PRO' } as Parameters<typeof setAuth>[0], token);
      }
      navigate('/subscription');
    } catch {
      setError('구독 시작 중 오류가 발생했습니다.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/subscription')} className="text-gray-400 hover:text-gray-700 transition">
          ← 구독 관리
        </button>
        <h1 className="text-3xl font-bold">PRO 구독 시작</h1>
      </div>

      {/* 요금제 안내 */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-8 mb-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold uppercase tracking-widest text-blue-200">선택한 요금제</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">PRO</span>
        </div>
        <div className="text-4xl font-black mb-1">월 9,900원</div>
        <p className="text-blue-200 text-sm">1개월 구독 · VAT 포함</p>
        <ul className="mt-5 space-y-2 text-sm text-blue-100">
          <li>✓ 실시간 AI 예산 조언 무제한</li>
          <li>✓ 캠페인 성과 분석 리포트</li>
          <li>✓ 월간 AI 인사이트 이메일</li>
          <li>✓ 우선 고객 지원</li>
        </ul>
      </div>

      {/* 결제 수단 영역 (추후 실제 결제 연동 예정) */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">결제 수단</h2>
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">결제 기능 준비 중</p>
            <p className="text-xs text-gray-400 mt-1">카드 등록 및 결제 연동이 곧 추가될 예정입니다.</p>
          </div>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* 1달 구독 버튼 */}
      <button
        onClick={handleSubscribe}
        disabled={subscribing}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow transition disabled:opacity-50"
      >
        {subscribing ? '처리 중...' : '1달 구독 시작'}
      </button>

      <p className="text-center text-xs text-gray-400 mt-4">
        구독 시작 시 <span className="font-medium">자동 갱신</span>이 활성화됩니다.
        구독 관리 페이지에서 언제든 해지할 수 있습니다.
      </p>
    </div>
  );
};

export default PaymentPage;
