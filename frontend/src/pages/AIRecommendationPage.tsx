import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Sparkles, Target, TrendingUp, Zap, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AIRecommendationPage() {
  const [formData, setFormData] = useState({
    name: '',
    industry: 'ecommerce',
    region: 'seoul',
    age_group: '25-34',
    gender: 'all',
    daily_budget: 100000,
    total_budget: 3000000,
    campaign_duration: 30,
    target_audience_size: 50000,
  });

  const recommendMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/ai/recommend', data);
      return response.data;
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recommendMutation.mutate(formData);
  };

  const result = recommendMutation.data?.data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI 광고 최적화 추천</h1>
          <p className="text-gray-600 mt-1">제품 정보만 입력하면 AI가 최적의 광고 전략을 제안합니다</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 입력 폼 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">제품 정보 입력</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제품/서비스명 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="예: 수제 케이크 배달"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">업종 *</label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="ecommerce">이커머스</option>
                <option value="finance">금융</option>
                <option value="education">교육</option>
                <option value="food_delivery">음식 배달</option>
                <option value="fashion">패션</option>
                <option value="tech">기술/IT</option>
                <option value="health">건강/의료</option>
                <option value="real_estate">부동산</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">지역</label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="seoul">서울</option>
                  <option value="busan">부산</option>
                  <option value="daegu">대구</option>
                  <option value="incheon">인천</option>
                  <option value="gwangju">광주</option>
                  <option value="daejeon">대전</option>
                  <option value="ulsan">울산</option>
                  <option value="others">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">타겟 연령</label>
                <select
                  value={formData.age_group}
                  onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="18-24">18-24세</option>
                  <option value="25-34">25-34세</option>
                  <option value="35-44">35-44세</option>
                  <option value="45-54">45-54세</option>
                  <option value="55+">55세 이상</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">타겟 성별</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">전체</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                일일 예산 (원)
              </label>
              <input
                type="number"
                value={formData.daily_budget}
                onChange={(e) => setFormData({ ...formData, daily_budget: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min="10000"
                step="10000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                총 예산 (원)
              </label>
              <input
                type="number"
                value={formData.total_budget}
                onChange={(e) => setFormData({ ...formData, total_budget: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min="100000"
                step="100000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  캠페인 기간 (일)
                </label>
                <input
                  type="number"
                  value={formData.campaign_duration}
                  onChange={(e) => setFormData({ ...formData, campaign_duration: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="7"
                  max="90"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  타겟 규모 (명)
                </label>
                <input
                  type="number"
                  value={formData.target_audience_size}
                  onChange={(e) => setFormData({ ...formData, target_audience_size: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="1000"
                  step="1000"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={recommendMutation.isPending}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {recommendMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  AI 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  AI 추천 받기
                </>
              )}
            </button>
          </form>
        </div>

        {/* 결과 표시 */}
        <div className="space-y-4">
          {recommendMutation.isPending && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">AI가 최적의 전략을 분석 중입니다...</p>
            </div>
          )}

          {recommendMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">추천 실패</h3>
                <p className="text-sm text-red-700 mt-1">
                  {(recommendMutation.error as any)?.message || 'AI 추천 중 오류가 발생했습니다.'}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  💡 Google Colab에서 모델을 학습하고 .pkl 파일을 backend/ml_models/에 복사했는지 확인하세요.
                </p>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* 신뢰도 */}
              <div className={`rounded-xl p-4 border-2 ${
                result.confidence.level === 'high' 
                  ? 'bg-green-50 border-green-200' 
                  : result.confidence.level === 'medium'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className={`w-5 h-5 ${
                    result.confidence.level === 'high' 
                      ? 'text-green-600' 
                      : result.confidence.level === 'medium'
                      ? 'text-yellow-600'
                      : 'text-blue-600'
                  }`} />
                  <h3 className="font-semibold text-gray-900">
                    신뢰도: {result.confidence.level === 'high' ? '높음' : result.confidence.level === 'medium' ? '중간' : '낮음'} 
                    ({(result.confidence.score * 100).toFixed(0)}%)
                  </h3>
                </div>
                <p className="text-sm text-gray-700">{result.confidence.message}</p>
              </div>

              {/* 플랫폼 추천 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">추천 플랫폼</h2>
                </div>

                <div className="space-y-3">
                  {/* Primary */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-purple-900">
                        {result.recommended_platforms.primary.platform.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 bg-purple-600 text-white text-sm font-medium rounded-full">
                        최우선 추천
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{result.recommended_platforms.primary.reason}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${result.recommended_platforms.primary.score * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-purple-900">
                        {(result.recommended_platforms.primary.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Alternatives */}
                  {result.recommended_platforms.alternatives.slice(0, 2).map((alt: any) => (
                    <div key={alt.platform} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{alt.platform.toUpperCase()}</span>
                        <span className="text-sm text-gray-600">{(alt.score * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-xs text-gray-600">{alt.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 성과 예측 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">플랫폼별 예상 성과</h2>
                </div>

                <div className="space-y-3">
                  {Object.entries(result.performance_forecast)
                    .sort((a: any, b: any) => b[1].roas - a[1].roas)
                    .map(([platform, forecast]: [string, any]) => (
                      <div key={platform} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{platform.toUpperCase()}</span>
                          <span className="text-lg font-bold text-green-600">{forecast.roas}x ROAS</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                          <div>
                            <p className="text-gray-500">예상 수익</p>
                            <p className="font-medium">{(forecast.estimated_revenue / 10000).toFixed(0)}만원</p>
                          </div>
                          <div>
                            <p className="text-gray-500">예상 비용</p>
                            <p className="font-medium">{(forecast.estimated_cost / 10000).toFixed(0)}만원</p>
                          </div>
                          <div>
                            <p className="text-gray-500">예상 이익</p>
                            <p className="font-medium text-green-600">
                              {(forecast.estimated_profit / 10000).toFixed(0)}만원
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* 예산 배분 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-lg font-semibold text-gray-900">추천 예산 배분</h2>
                </div>

                <div className="space-y-3">
                  {Object.entries(result.budget_allocation.recommended_allocation).map(([platform, alloc]: [string, any]) => (
                    <div key={platform} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{platform.toUpperCase()}</span>
                          <span className="text-sm text-gray-600">{alloc.percentage}%</span>
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
                            style={{ width: `${alloc.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {(alloc.budget / 10000).toFixed(0)}만원
                        </p>
                        <p className="text-xs text-gray-500">
                          → {(alloc.expected_return / 10000).toFixed(0)}만원
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">총 예상 수익</span>
                    <span className="text-lg font-bold text-green-600">
                      {(result.budget_allocation.expected_total_return / 10000).toFixed(0)}만원
                    </span>
                  </div>
                </div>
              </div>

              {/* 실행 전략 */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">연계 플랫폼 전략</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-purple-900 mb-2">전략 조합</h3>
                    <div className="flex items-center gap-2">
                      {result.cross_platform_strategy.combination.map((platform: string, idx: number) => (
                        <div key={platform} className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-white rounded-lg text-sm font-medium">
                            {platform.toUpperCase()}
                          </span>
                          {idx < result.cross_platform_strategy.combination.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 mt-2">
                      {result.cross_platform_strategy.combination_rationale}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-purple-900 mb-2">실행 순서</h3>
                    <div className="space-y-2">
                      {result.cross_platform_strategy.execution_order.map((step: any) => (
                        <div key={step.phase} className="flex items-start gap-3 text-sm">
                          <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {step.phase}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">
                              {step.platform.toUpperCase()} - {step.objective}
                            </p>
                            <p className="text-gray-600">{step.duration} | 예산 {step.budget_ratio}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
