import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../lib/api';

interface SubscriptionInfo {
  plan: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  pay_auto_renew: number;
}

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, token, setAuth } = useAuthStore();

  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [testExpiring, setTestExpiring] = useState(false);
  const [togglingRenew, setTogglingRenew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    authAPI.getSubscription()
      .then((res) => setInfo(res.data))
      .catch(() => setError('정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const isPro = info?.plan === 'PRO';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const handleCancel = async () => {
    if (!confirm('구독 해지를 신청하면 자동 갱신이 꺼지고,\n만료일 이후 FREE 요금제로 전환됩니다.\n계속하시겠습니까?')) return;
    setCancelling(true);
    setError(null);
    try {
      await authAPI.updateAutoRenew(0);
      setInfo((prev) => prev ? { ...prev, pay_auto_renew: 0 } : prev);
      setMsg(`구독 해지가 신청되었습니다. ${formatDate(info?.plan_expires_at ?? null)} 이후 FREE로 전환됩니다.`);
    } catch {
      setError('구독 해지 신청 중 오류가 발생했습니다.');
    } finally {
      setCancelling(false);
    }
  };

  const handleTestExpire = async () => {
    setTestExpiring(true);
    setError(null);
    try {
      const res = await authAPI.testExpireSubscription();
      const subRes = await authAPI.getSubscription();
      setInfo(subRes.data);
      // FREE 전환된 경우 zustand store도 업데이트
      if (subRes.data.plan === null && user && token) {
        setAuth({ ...user, plan: undefined } as Parameters<typeof setAuth>[0], token);
      }
      setMsg(res.data.message);
    } catch {
      setError('테스트 실행 중 오류가 발생했습니다.');
    } finally {
      setTestExpiring(false);
    }
  };

  const handleToggleRenew = async () => {
    if (!info) return;
    const next = info.pay_auto_renew ? 0 : 1;
    setTogglingRenew(true);
    setError(null);
    try {
      await authAPI.updateAutoRenew(next as 0 | 1);
      setInfo((prev) => prev ? { ...prev, pay_auto_renew: next } : prev);
    } catch {
      setError('자동 갱신 설정 변경 중 오류가 발생했습니다.');
    } finally {
      setTogglingRenew(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/me')} className="text-gray-400 hover:text-gray-700 transition">
          ← 내 정보
        </button>
        <h1 className="text-3xl font-bold">구독 관리</h1>
      </div>

      {loading && <div className="text-center py-20 text-gray-400">불러오는 중...</div>}

      {!loading && (
        <>
          {/* 현재 요금제 카드 */}
          <div className={`rounded-2xl p-8 mb-6 shadow ${
            isPro
              ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
              : 'bg-white border-2 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-semibold uppercase tracking-widest ${isPro ? 'text-blue-200' : 'text-gray-400'}`}>
                현재 요금제
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${isPro ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {isPro ? 'PRO' : 'FREE'}
              </span>
            </div>
            <div className={`text-4xl font-black mb-2 ${isPro ? 'text-white' : 'text-gray-800'}`}>
              {isPro ? 'PRO' : 'FREE'}
            </div>
            <p className={`text-sm ${isPro ? 'text-blue-200' : 'text-gray-400'}`}>
              {isPro
                ? '프리미엄 기능을 무제한으로 이용 중입니다.'
                : 'PRO로 업그레이드하면 실시간 예산 조언을 무제한으로 받을 수 있습니다.'}
            </p>
          </div>

          {/* 구독 상세 */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">구독 상세</h2>
            <div>
              {/* 구독 상태 */}
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-sm text-gray-500">구독 상태</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isPro ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {isPro ? '구독 중' : '미구독'}
                </span>
              </div>

              {/* 구독 시작일 */}
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-sm text-gray-500">구독 시작일</span>
                <span className="text-sm font-medium text-gray-700">
                  {isPro ? formatDate(info?.plan_started_at ?? null) : '-'}
                </span>
              </div>

              {/* 구독 만료일 */}
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-sm text-gray-500">구독 만료일</span>
                <span className="text-sm font-medium text-gray-700">
                  {isPro ? formatDate(info?.plan_expires_at ?? null) : '-'}
                </span>
              </div>

              {/* 자동 갱신 토글 */}
              <div className="flex justify-between items-center py-3">
                <div>
                  <span className="text-sm text-gray-500">자동 갱신</span>
                  {isPro && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {info?.pay_auto_renew
                        ? '만료일에 자동으로 1개월 연장됩니다.'
                        : '만료일 이후 FREE 요금제로 전환됩니다.'}
                    </p>
                  )}
                </div>
                {isPro ? (
                  <button
                    onClick={handleToggleRenew}
                    disabled={togglingRenew}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                      info?.pay_auto_renew ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      info?.pay_auto_renew ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                ) : (
                  <span className="text-sm font-medium text-gray-400">-</span>
                )}
              </div>
            </div>
          </div>

          {/* 메시지 */}
          {msg && <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 text-green-700 text-sm">{msg}</div>}
          {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

          {/* PRO 구독 시작 (FREE 전용) */}
          {!isPro && !msg && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 text-center border border-blue-100 mb-6">
              <p className="text-gray-600 mb-4 text-sm">
                PRO 요금제로 업그레이드하여 모든 프리미엄 기능을 이용해보세요.
              </p>
              <button
                onClick={() => navigate('/payment')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition"
              >
                PRO 업그레이드
              </button>
            </div>
          )}

          {/* 구독 해지 (PRO 전용) */}
          {isPro && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold mb-1 text-gray-800">구독 해지</h2>
              <p className="text-sm text-gray-400 mb-4">
                자동 갱신이 꺼지며, 만료일({formatDate(info?.plan_expires_at ?? null)}) 이후 FREE 요금제로 전환됩니다.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg border border-red-200 transition disabled:opacity-50"
                >
                  {cancelling ? '처리 중...' : '구독 해지'}
                </button>
                <button
                  onClick={handleTestExpire}
                  disabled={testExpiring}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-medium rounded-lg border border-gray-200 transition disabled:opacity-50"
                >
                  {testExpiring ? '처리 중...' : '구독 만료일 초기화 (test)'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SubscriptionPage;
