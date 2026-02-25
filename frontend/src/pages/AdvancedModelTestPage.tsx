import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Brain, TrendingUp, Target,
  AlertTriangle, Search, RefreshCw,
  Lightbulb, CheckCircle, AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

// ── 타입 정의 ─────────────────────────────────────────────────────────────
interface CampaignRank { media: string; best: string; worst: string; }

interface XGBoostResult {
  status: 'success' | 'insufficient' | 'error';
  mae?: number;
  dataSize?: number;
  platformMae?: { name: string; error: number }[];
  sample?: { platform: string; cost: number; impressions: number; clicks: number; predicted: number; actual: number; };
  message?: string;
  aiAnalysis?: string; // AI 분석 필드 추가
}

interface RFResult {
  status: 'success' | 'insufficient' | 'error';
  accuracy?: number;
  dataSize?: number;
  platformMetrics?: { name: string; precision: number; recall: number }[];
  sample?: { totalImpressions: number; totalCost: number; predicted: string; actual: string; };
  message?: string;
  aiAnalysis?: string; // AI 분석 필드 추가
}

interface Recommendation {
  type: 'budget_increase' | 'budget_decrease' | 'creative_optimization' | 'platform_diversification';
  priority: 'high' | 'medium' | 'low';
  campaign_name?: string;
  platform?: string;
  current_budget?: number;
  suggested_budget?: number;
  current_ctr?: string;
  reason: string;
  expected_impact?: string;
  suggested_platforms?: string[];
}

// ── 날짜 유틸 ──────────────────────────────────────────────────────────────
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
const today   = () => new Date().toISOString().split('T')[0];

// ── 컴포넌트 ───────────────────────────────────────────────────────────────
const AdvancedModelTestPage: React.FC = () => {
  // 기간 상태 (기본값: 1주일)
  const [startDate, setStartDate] = useState<string>(daysAgo(7));
  const [endDate,   setEndDate]   = useState<string>(today());

  // 캠페인 랭킹
  const [campaignRanks, setCampaignRanks] = useState<CampaignRank[]>([]);
  const [rankAnalysis,  setRankAnalysis]  = useState<string>(''); // 캠페인 랭킹 AI 분석
  const [isRankLoading, setIsRankLoading] = useState(true);

  // ML 모델
  const [xgboost,    setXgboost]    = useState<XGBoostResult | null>(null);
  const [rf,         setRf]         = useState<RFResult | null>(null);
  const [isMLLoading, setIsMLLoading] = useState(true);

  // Random Forest 토글 (기본 숨김)
  const [showRF, setShowRF] = useState(false);

  // AI 추천
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isRecsLoading,   setIsRecsLoading]   = useState(true);

  // ── API 호출 ──────────────────────────────────────────────────────────────
  const fetchRanks = useCallback(async () => {
    setIsRankLoading(true);
    try {
      const res = await api.get('/ai/agent/advanced-metrics', { params: { startDate, endDate } });
      if (res.data?.success) {
        setCampaignRanks(res.data.data.campaignRanks ?? []);
        setRankAnalysis(res.data.data.aiAnalysis ?? '');
      }
    } catch (e) { console.error('캠페인 랭킹 조회 실패:', e); }
    finally { setIsRankLoading(false); }
  }, [startDate, endDate]);

  const fetchML = useCallback(async () => {
    setIsMLLoading(true);
    try {
      const res = await api.get('/ai/agent/ml-realtime', { params: { startDate, endDate } });
      if (res.data?.success) {
        setXgboost(res.data.data.xgboost    ?? null);
        setRf(     res.data.data.randomforest ?? null);
      }
    } catch (e) { console.error('ML 실시간 예측 실패:', e); }
    finally { setIsMLLoading(false); }
  }, [startDate, endDate]);

  const fetchRecs = useCallback(async () => {
    setIsRecsLoading(true);
    try {
      const res = await api.get('/insights/recommendations');
      if (res.data?.recommendations) setRecommendations(res.data.recommendations);
    } catch (e) { console.error('AI 추천 조회 실패:', e); }
    finally { setIsRecsLoading(false); }
  }, []);

  useEffect(() => {
    fetchRanks();
    fetchML();
    fetchRecs();
  }, [fetchRanks, fetchML, fetchRecs]);

  const handleSearch = () => { fetchRanks(); fetchML(); fetchRecs(); };

  // ── 헬퍼 ──────────────────────────────────────────────────────────────────
  const getRecIcon = (type: string) => {
    if (type === 'budget_increase')        return <TrendingUp   className="w-5 h-5 text-green-600" />;
    if (type === 'budget_decrease')        return <AlertTriangle className="w-5 h-5 text-red-500"   />;
    if (type === 'creative_optimization')  return <Target        className="w-5 h-5 text-blue-600"  />;
    if (type === 'platform_diversification') return <Brain       className="w-5 h-5 text-purple-600"/>;
    return <Lightbulb className="w-5 h-5 text-yellow-500" />;
  };
  const getPriorityStyle = (p: string) =>
    p === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
    p === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
    'bg-blue-100 text-blue-700 border-blue-200';
  const getPriorityLabel = (p: string) => p === 'high' ? '높음' : p === 'medium' ? '보통' : '낮음';

  const isAnyLoading = isRankLoading || isMLLoading;

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 헤더 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <Link to="/dummy" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="text-blue-600" />
              AI 고급 모델 테스트 결과 (임시 페이지)
            </h1>
            <p className="text-gray-500 text-sm mt-1">실제 DB 데이터를 기반으로 학습된 XGBoost 및 Random Forest 모델의 성과 지표입니다.</p>
          </div>
        </div>

        {/* 통합 기간 필터 */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">📅 조회 기간</span>
          {[{ label: '1주일', days: 7 }, { label: '1개월', days: 30 }, { label: '3개월', days: 90 }].map(({ label, days }) => (
            <button key={days} onClick={() => { setStartDate(daysAgo(days)); setEndDate(today()); }}
              className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition">
              {label}
            </button>
          ))}
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2">
            <label htmlFor="gs" className="text-xs text-gray-500">시작일</label>
            <input id="gs" type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <span className="text-gray-400">~</span>
          <div className="flex items-center gap-2">
            <label htmlFor="ge" className="text-xs text-gray-500">종료일</label>
            <input id="ge" type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <button onClick={handleSearch} disabled={isAnyLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            {isAnyLoading ? <><RefreshCw size={14} className="animate-spin" /> 분석 중...</> : <><Search size={14} /> 조회</>}
          </button>
        </div>

        {/* 1. XGBoost (전체 너비) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6 relative">
          {isMLLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-2xl">
              <span className="text-sm text-gray-500 animate-pulse">🔄 ML 모델 학습 중...</span>
            </div>
          )}
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-green-500" /> 1. XGBoost 앱 설치(전환) 예측
            </h2>
            <span className="px-3 py-1 bg-green-50 text-green-700 font-bold rounded-full text-xs">Regressor</span>
          </div>

          {xgboost?.status === 'success' ? (
            <>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">전체 평균 절대 오차 (MAE)</p>
                <p className="text-3xl font-extrabold text-gray-900">{xgboost.mae} <span className="text-lg text-gray-500 font-normal">건</span></p>
                <p className="text-xs text-gray-400 mt-2">학습 데이터: {xgboost.dataSize?.toLocaleString()}건 | 비용·노출·클릭 입력 → 설치 수 예측</p>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-sm text-gray-700 uppercase">📊 매체별 오차 (MAE)</h3>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr><th className="px-4 py-2 font-medium">매체</th><th className="px-4 py-2 font-medium text-right">오차 (MAE)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {xgboost.platformMae?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-2 font-medium text-gray-800">{item.name}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{item.error} 건</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {xgboost.sample && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-gray-700 uppercase">💡 샘플 시뮬레이션 테스트</h3>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm">
                    <ul className="space-y-2 text-gray-700">
                      <li>
                        <span className="font-semibold text-gray-900">테스트 조건:</span>{' '}
                        {xgboost.sample.platform} 매체, 지출 {xgboost.sample.cost.toLocaleString()}원,
                        노출 {xgboost.sample.impressions.toLocaleString()}회,
                        클릭 {xgboost.sample.clicks.toLocaleString()}회
                      </li>
                      <li className="pt-2 border-t border-blue-200 flex justify-between items-center text-lg mt-2">
                        <span className="font-semibold">실제 설치수: <span className="font-black text-gray-900">{xgboost.sample.actual} 건</span></span>
                        <span className="font-semibold text-blue-700">AI 예측: <span className="font-black">{xgboost.sample.predicted} 건</span></span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-2">
              <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-orange-800">
                {xgboost?.message ?? (isMLLoading ? '분석 중...' : '해당 기간에 분석 데이터가 없습니다. 기간을 늘려 조회해보세요.')}
              </p>
            </div>
          )}

          {/* AI 분석 섹션 추가 */}
          {xgboost?.status === 'success' && xgboost.aiAnalysis && (
            <div className="mt-4 p-5 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition">
                <Brain size={48} className="text-green-600" />
              </div>
              <h3 className="text-sm font-bold text-green-800 flex items-center gap-1.5 mb-2">
                <Brain size={16} /> AI 전문가의 XGBoost 예측 모델 분석
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{xgboost.aiAnalysis}</p>
            </div>
          )}
        </div>

        {/* 2. 캠페인 랭킹 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-blue-500" /> 2. 매체별 최우수 / 최하위 효율 캠페인 (데이터 분석)
          </h2>
          <p className="text-sm text-gray-500">비용 대비 설치 수(1원당 설치 전환)를 기준으로 집계한 각 매체별 가장 효율적인 1등 캠페인과 효율이 가장 낮은 꼴등 캠페인입니다. (위의 기간 필터 동일 적용)</p>
          <div className="overflow-x-auto border border-gray-100 rounded-xl relative">
            {isRankLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <span className="text-sm font-medium text-gray-500 animate-pulse">실제 DB 분석 중...</span>
              </div>
            )}
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium border-r">광고 매체</th>
                  <th className="px-4 py-3 font-medium text-green-700 bg-green-50/50 border-r">🏆 1등 캠페인 (최고 효율)</th>
                  <th className="px-4 py-3 font-medium text-red-700 bg-red-50/50">⚠️ 꼴등 캠페인 (최저 효율)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaignRanks.length === 0 && !isRankLoading ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">해당 기간에 집계할 수 있는 캠페인 성과 데이터가 없습니다.</td></tr>
                ) : (
                  campaignRanks.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-bold text-gray-800 border-r">{item.media}</td>
                      <td className="px-4 py-3 font-medium text-gray-700 bg-green-50/20 border-r">{item.best}</td>
                      <td className="px-4 py-3 text-gray-600 bg-red-50/20">{item.worst}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* AI 분석 섹션 추가 */}
          {campaignRanks.length > 0 && rankAnalysis && (
            <div className="mt-4 p-5 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition">
                <Brain size={48} className="text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-blue-800 flex items-center gap-1.5 mb-2">
                <Brain size={16} /> AI 전문가의 캠페인 효율 랭킹 분석
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{rankAnalysis}</p>
            </div>
          )}
        </div>

        {/* 3. AI 최적화 추천 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Lightbulb className="text-yellow-500" /> 3. AI 최적화 추천
            </h2>
            <span className="text-xs text-gray-400">최근 30일 데이터 기반 자동 분석</span>
          </div>

          {isRecsLoading ? (
            <div className="py-8 text-center text-sm text-gray-400 animate-pulse">AI 추천 생성 중...</div>
          ) : recommendations.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-gray-400">
              <AlertCircle size={32} />
              <p className="text-sm">추천을 생성할 캠페인 성과 데이터가 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="py-4 flex items-start gap-4 hover:bg-gray-50 transition rounded-xl px-2">
                  <div className="flex-shrink-0 mt-0.5">{getRecIcon(rec.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {rec.campaign_name && <span className="font-semibold text-gray-900 text-sm">{rec.campaign_name}</span>}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityStyle(rec.priority)}`}>{getPriorityLabel(rec.priority)}</span>
                      {rec.platform && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{rec.platform}</span>}
                    </div>
                    <p className="text-sm text-gray-700">{rec.reason}</p>
                    {rec.current_budget !== undefined && (
                      <p className="text-xs text-gray-500">현재 예산: <span className="font-medium">{rec.current_budget.toLocaleString()}원</span>{' → '}<span className="font-medium text-blue-600">{rec.suggested_budget?.toLocaleString()}원</span></p>
                    )}
                    {rec.current_ctr !== undefined && <p className="text-xs text-gray-500">현재 CTR: <span className="font-medium">{rec.current_ctr}%</span></p>}
                    {rec.expected_impact && (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle size={14} /><span>{rec.expected_impact}</span>
                      </div>
                    )}
                    {rec.suggested_platforms && rec.suggested_platforms.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">추천 플랫폼:</span>
                        {rec.suggested_platforms.map((p: string) => (
                          <span key={p} className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Random Forest 매체 추천 (맨 아래, 토글) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Target className="text-purple-500" />
              Random Forest 매체 추천
              <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold rounded-full text-xs">Classifier</span>
            </h2>
            <button
              onClick={() => setShowRF(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                showRF
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Target size={14} />
              {showRF ? '접기' : 'Random Forest 결과 보기'}
            </button>
          </div>

          {!showRF && (
            <p className="text-sm text-gray-400 text-center py-2">
              ↑ 버튼을 눌러 Random Forest 매체 추천 모델 결과를 확인하세요.
            </p>
          )}

          {showRF && (
            <div className="space-y-6 relative">
              {isMLLoading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
                  <span className="text-sm text-gray-500 animate-pulse">🔄 ML 모델 학습 중...</span>
                </div>
              )}

              {rf?.status === 'success' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                      <p className="text-xs text-gray-500 mb-1">정확도 (Accuracy)</p>
                      <p className="text-2xl font-extrabold text-gray-900">{rf.accuracy?.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                      <p className="text-xs text-gray-500 mb-1">학습 날짜 수</p>
                      <p className="text-2xl font-extrabold text-gray-900">{rf.dataSize}일</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-gray-700 uppercase">📊 매체별 추천 정밀도/재현율</h3>
                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 border-b">
                          <tr>
                            <th className="px-4 py-2 font-medium">매체</th>
                            <th className="px-4 py-2 font-medium text-center">정밀도</th>
                            <th className="px-4 py-2 font-medium text-center">재현율</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rf.platformMetrics?.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-2 font-medium text-gray-800">{item.name}</td>
                              <td className="px-4 py-2 text-center text-gray-600">{item.precision.toFixed(2)}</td>
                              <td className="px-4 py-2 text-center text-gray-600">{item.recall.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {rf.sample && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-sm text-gray-700 uppercase">💡 최고 효율 매체 추천 시뮬레이션</h3>
                      <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-sm">
                        <ul className="space-y-2 text-gray-700">
                          <li>
                            <span className="font-semibold text-gray-900">광고 환경:</span>{' '}
                            당일 노출 {rf.sample.totalImpressions.toLocaleString()}회,
                            예산 {rf.sample.totalCost.toLocaleString()}원
                          </li>
                          <li className="pt-2 border-t border-purple-200 flex justify-between items-center text-lg mt-2">
                            <span className="font-semibold">실제 1등: <span className="font-black text-gray-900">{rf.sample.actual}</span></span>
                            <span className="font-semibold text-purple-700">AI 추천: <span className="font-black">{rf.sample.predicted}</span></span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-orange-800">
                    {rf?.message ?? (isMLLoading ? '분석 중...' : '해당 기간에 분석 데이터가 없습니다. 기간을 늘려 조회해보세요.')}
                  </p>
                </div>
              )}

              {/* AI 분석 섹션 추가 */}
              {showRF && rf?.status === 'success' && rf.aiAnalysis && !isMLLoading && (
                <div className="mt-4 p-5 bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition">
                    <Brain size={48} className="text-purple-600" />
                  </div>
                  <h3 className="text-sm font-bold text-purple-800 flex items-center gap-1.5 mb-2">
                    <Brain size={16} /> AI 전문가의 매체 추천 로직 분석
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{rf.aiAnalysis}</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdvancedModelTestPage;
