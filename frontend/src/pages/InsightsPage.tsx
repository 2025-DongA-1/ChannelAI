import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { insightsAPI } from '@/lib/api';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Lightbulb, 
  Calendar,
  Download,
  AlertCircle,
  CheckCircle,
  Target,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency, formatCompactNumber, getPlatformColor } from '@/lib/utils';

export default function InsightsPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // 추세 분석 데이터
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['insights-trends', dateRange],
    queryFn: () => insightsAPI.getTrends({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
  });

  // 플랫폼 비교 데이터
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery({
    queryKey: ['insights-comparison', dateRange],
    queryFn: () => insightsAPI.getComparison({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
  });

  // AI 추천 데이터
  const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['insights-recommendations'],
    queryFn: () => insightsAPI.getRecommendations(),
  });

  const trends = trendsData?.data;
  const comparison = comparisonData?.data;
  const recommendations = recommendationsData?.data;

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleExportPDF = () => {
    // PDF 생성 로직 (추후 구현)
    alert('PDF 리포트 다운로드 기능은 곧 제공됩니다.');
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPriorityColor = (priority: string | number) => {
    const p = typeof priority === 'number' ? priority : priority;
    switch (p) {
      case 'high': case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': case 2: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': case 3: return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'budget_increase':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'budget_decrease':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'creative_optimization':
        return <Target className="w-5 h-5 text-blue-600" />;
      case 'platform_diversification':
        return <BarChart3 className="w-5 h-5 text-purple-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-yellow-600" />;
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (trendsLoading || comparisonLoading || recommendationsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">인사이트 & 리포트</h1>
          <p className="text-gray-600 mt-1">데이터 기반 성과 분석 및 최적화 제안</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Download className="w-5 h-5 mr-2" />
          PDF 다운로드
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">분석 기간:</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-500">~</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => handleDateChange('end', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Performance Summary Cards */}
      {trends && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">총 노출수</p>
              {getChangeIcon(trends.changes.impressions)}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCompactNumber(trends.current.impressions)}
            </p>
            <p className={`text-sm mt-1 ${getChangeColor(trends.changes.impressions)}`}>
              {trends.changes.impressions > 0 ? '+' : ''}
              {trends.changes.impressions.toFixed(1)}% 전 기간 대비
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">총 클릭수</p>
              {getChangeIcon(trends.changes.clicks)}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCompactNumber(trends.current.clicks)}
            </p>
            <p className={`text-sm mt-1 ${getChangeColor(trends.changes.clicks)}`}>
              {trends.changes.clicks > 0 ? '+' : ''}
              {trends.changes.clicks.toFixed(1)}% 전 기간 대비
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">총 광고비</p>
              {getChangeIcon(trends.changes.cost)}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(trends.current.cost)}
            </p>
            <p className={`text-sm mt-1 ${getChangeColor(trends.changes.cost)}`}>
              {trends.changes.cost > 0 ? '+' : ''}
              {trends.changes.cost.toFixed(1)}% 전 기간 대비
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">ROAS</p>
              {getChangeIcon(trends.changes.roas)}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(trends.current.cost > 0 ? trends.current.revenue / trends.current.cost : 0).toFixed(2)}x
            </p>
            <p className={`text-sm mt-1 ${getChangeColor(trends.changes.roas)}`}>
              {trends.changes.roas > 0 ? '+' : ''}
              {trends.changes.roas.toFixed(1)}% 전 기간 대비
            </p>
          </div>
        </div>
      )}

      {/* Performance Trend Chart */}
      {trends && trends.timeline && trends.timeline.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">성과 추세</h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trends.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: any) => formatCompactNumber(Number(value))}
                labelFormatter={(label) => new Date(label).toLocaleDateString('ko-KR')}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#3B82F6" name="노출수" strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#10B981" name="클릭수" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#F59E0B" name="광고비" strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="#8B5CF6" name="전환수" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          
          {/* 💡 [추가됨] 초보자를 위한 데이터 상세 해석 박스 */}
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-900 text-sm mb-1">💡 데이터 돋보기: 성과 추세 읽는 법</p>
              <p className="text-sm text-indigo-800 leading-relaxed">
                파란색 선(노출수) 대비 초록색 선(클릭수)이 함께 올라가고 있다면 타겟팅이 아주 잘 되고 있다는 뜻입니다! 
                만약 광고비(노란선)는 꾸준히 나가는데 클릭수나 전환수(보라선)가 정체되어 있다면, 사람들의 눈에 익어 '광고 피로도'가 높아진 상태일 수 있으니 새로운 이미지나 문구로 교체해 보는 것을 추천해 드려요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Platform Comparison */}
      {comparison && comparison.platforms && comparison.platforms.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform Performance Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">플랫폼별 광고비 분포</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={comparison.platforms}
                  dataKey="cost"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${entry.platform} (${entry.cost_share.toFixed(1)}%)`}
                >
                  {comparison.platforms.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Platform ROAS Comparison */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">플랫폼별 ROAS 비교</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparison.platforms}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)}x`} />
                <Legend />
                <Bar dataKey="roas" fill="#10B981" name="ROAS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Platform Performance Table */}
      {comparison && comparison.platforms && comparison.platforms.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">플랫폼 성과 비교</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">플랫폼</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">캠페인 수</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">노출수</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">클릭수</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">전환수</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">광고비</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparison.platforms.map((platform: any) => (
                  <tr key={platform.platform} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPlatformColor(platform.platform)}`}>
                        {platform.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {platform.campaign_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCompactNumber(platform.impressions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCompactNumber(platform.clicks)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {(platform.ctr ?? 0).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCompactNumber(platform.conversions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(platform.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      <span className={(platform.roas ?? 0) >= 2 ? 'text-green-600' : (platform.roas ?? 0) >= 1 ? 'text-yellow-600' : 'text-red-600'}>
                        {(platform.roas ?? 0).toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 💡 [추가됨] 성과 비교 표 하단 요약 및 해석 */}
          <div className="bg-blue-50 p-5 border-t border-gray-100">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 text-sm mb-1.5">💡 데이터 돋보기: 어떤 채널이 제일 열일하고 있을까요?</p>
                <p className="text-sm text-blue-800 leading-relaxed">
                  위 표에서 가장 중요하게 보셔야 할 숫자는 제일 오른쪽에 있는 <strong className="font-bold">ROAS(광고 수익률)</strong>입니다! 
                  ROAS가 가장 높은 플랫폼이 현재 사장님의 타겟 고객과 가장 궁합이 잘 맞는 채널이에요. 
                  반대로 <strong className="font-bold">CTR(클릭률)</strong>은 높은데 ROAS가 1.0x 이하라면, 고객이 광고를 보고 클릭은 많이 하지만 실제 구매나 문의로는 이어지지 않고 있다는 뜻이랍니다. 
                  효율이 높은 채널에 예산을 조금 더 실어주는 '선택과 집중'을 고려해 보세요!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations && recommendations.recommendations && recommendations.recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                  AI 최적화 추천
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  최근 {recommendations.analysis_period.start} ~ {recommendations.analysis_period.end} 데이터 기반
                </p>
              </div>
              <div className="text-sm text-gray-600">
                총 {recommendations.recommendations.length}개 추천
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recommendations.recommendations.map((rec: any, index: number) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getRecommendationIcon(rec.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {rec.campaign_name && (
                          <h3 className="font-semibold text-gray-900">{rec.campaign_name}</h3>
                        )}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(rec.priority)}`}>
                          {rec.priority === 'high' ? '높음' : rec.priority === 'medium' ? '보통' : '낮음'}
                        </span>
                        {rec.platform && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPlatformColor(rec.platform)}`}>
                            {rec.platform}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{rec.reason}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      {rec.current_budget !== undefined && (
                        <>
                          <span>현재 예산: {formatCurrency(rec.current_budget)}</span>
                          <span>→</span>
                          <span className="font-medium text-blue-600">
                            권장 예산: {formatCurrency(rec.suggested_budget)}
                          </span>
                        </>
                      )}
                      {rec.current_ctr !== undefined && (
                        <span>현재 CTR: {rec.current_ctr}%</span>
                      )}
                    </div>
                    {rec.expected_impact && (
                      <div className="mt-2 flex items-center text-sm text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {rec.expected_impact}
                      </div>
                    )}
                    {rec.suggested_platforms && rec.suggested_platforms.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-gray-600">추천 플랫폼:</span>
                        {rec.suggested_platforms.map((p: string) => (
                          <span key={p} className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPlatformColor(p)}`}>
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* 💡 [추가됨] 예산 수정 실행 가이드 (Action Guide) */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <a 
                        href={
                          rec.platform?.toLowerCase() === 'meta' ? 'https://business.facebook.com/' :
                          rec.platform?.toLowerCase() === 'google' ? 'https://ads.google.com/' :
                          rec.platform?.toLowerCase() === 'naver' ? 'https://searchad.naver.com/' :
                          '#'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100"
                      >
                        🛠️ {rec.platform || '광고 매체'} 관리자 센터로 이동해서 예산 수정하기 &rarr;
                      </a>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {recommendations && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">분석 캠페인 수</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  {recommendations.summary.total_campaigns}
                </p>
              </div>
              <BarChart3 className="w-12 h-12 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">고성과 캠페인</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {recommendations.summary.high_performers}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">개선 필요 캠페인</p>
                <p className="text-3xl font-bold text-yellow-900 mt-2">
                  {recommendations.summary.needs_optimization}
                </p>
              </div>
              <AlertCircle className="w-12 h-12 text-yellow-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
