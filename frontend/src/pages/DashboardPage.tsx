import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { dashboardAPI, aiAgentAPI } from '@/lib/api';
import { formatCurrency, formatPercent, formatCompactNumber } from '@/lib/utils';
import { 
  TrendingUp, MousePointerClick, DollarSign, Target, ArrowUp, ArrowDown, Calendar,
  Bot, Play, AlertTriangle, Pause, TrendingDown, Zap, ShieldCheck, Loader2
} from 'lucide-react';

export default function DashboardPage() {
  // 기본 기간: 최근 30일
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedPreset, setSelectedPreset] = useState('30days');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary', dateRange.startDate, dateRange.endDate],
    queryFn: () => dashboardAPI.getSummary({ 
      startDate: dateRange.startDate, 
      endDate: dateRange.endDate 
    }),
  });

  const { data: performance } = useQuery({
    queryKey: ['channel-performance', dateRange.startDate, dateRange.endDate],
    queryFn: () => dashboardAPI.getChannelPerformance({ 
      startDate: dateRange.startDate, 
      endDate: dateRange.endDate 
    }),
  });

  const metrics = summary?.data?.metrics;
  const budget = summary?.data?.budget;

  // AI 마케팅 에이전트
  const analyzeMutation = useMutation({
    mutationFn: (data: { totalBudget?: number; period?: number }) =>
      aiAgentAPI.analyze(data),
  });

  const agentData = analyzeMutation.data?.data?.data;

  const handleRunAgent = () => {
    analyzeMutation.mutate({
      totalBudget: budget?.total || undefined,
      period: selectedPreset === '7days' ? 7 : selectedPreset === '90days' ? 90 : 30,
    });
  };

  // 날짜 프리셋 선택
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const endDate = new Date().toISOString().split('T')[0];
    let startDate = endDate;

    switch (preset) {
      case 'today':
        startDate = endDate;
        break;
      case 'yesterday':
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        startDate = yesterday.toISOString().split('T')[0];
        setDateRange({ startDate, endDate: startDate });
        return;
      case '7days':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90days':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
    }

    setDateRange({ startDate, endDate });
  };

  // 사용자 지정 날짜 변경
  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    setSelectedPreset('custom');
    setDateRange(prev => ({
      ...prev,
      [type === 'start' ? 'startDate' : 'endDate']: value,
    }));
  };

  // 날짜 범위 텍스트
  const getDateRangeText = () => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    if (dateRange.startDate === dateRange.endDate) {
      return start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    }
    
    return `${start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`;
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">통합 성과 대시보드</h1>
          <p className="text-gray-600 mt-1">실시간 마케팅 성과를 한눈에 확인하세요</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          리포트 다운로드
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">{getDateRangeText()}</span>
          </div>
          
          <div className="flex-1 flex flex-wrap items-center gap-2">
            {/* Preset Buttons */}
            <button
              onClick={() => handlePresetChange('today')}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                selectedPreset === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              오늘
            </button>
            <button
              onClick={() => handlePresetChange('yesterday')}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                selectedPreset === 'yesterday'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              어제
            </button>
            <button
              onClick={() => handlePresetChange('7days')}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                selectedPreset === '7days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              최근 7일
            </button>
            <button
              onClick={() => handlePresetChange('30days')}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                selectedPreset === '30days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              최근 30일
            </button>
            <button
              onClick={() => handlePresetChange('90days')}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                selectedPreset === '90days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              최근 90일
            </button>

            {/* Custom Date Inputs */}
            <div className="flex items-center gap-2 ml-4">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                max={dateRange.endDate}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500">~</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                min={dateRange.startDate}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="총 노출수"
          value={formatCompactNumber(metrics?.impressions || 0)}
          change={12.5}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="총 클릭수"
          value={formatCompactNumber(metrics?.clicks || 0)}
          change={8.2}
          icon={MousePointerClick}
          color="green"
        />
        <MetricCard
          title="총 광고비"
          value={formatCurrency(metrics?.cost || 0)}
          change={-3.1}
          icon={DollarSign}
          color="yellow"
        />
        <MetricCard
          title="전환수"
          value={formatCompactNumber(metrics?.conversions || 0)}
          change={15.8}
          icon={Target}
          color="purple"
        />
      </div>

      {/* Performance Summary with Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PerformanceMetricCard
          title="클릭률 (CTR)"
          subtitle="광고를 본 사람 중 클릭한 비율"
          value={metrics?.ctr || 0}
          format="percent"
          benchmarks={{
            good: 3.5,
            average: 2.0,
            poor: 1.0
          }}
          advice={{
            good: "훌륭합니다! 광고 소재가 타겟에게 매력적으로 다가가고 있어요. 현재 전략을 유지하세요.",
            average: "괜찮은 수준이에요. 광고 이미지나 문구를 A/B 테스트해보면 더 좋은 결과를 얻을 수 있어요.",
            poor: "개선이 필요해요. 타겟 고객층을 재검토하고, 광고 소재를 더 눈에 띄게 만들어보세요."
          }}
        />
        <PerformanceMetricCard
          title="클릭당 비용 (CPC)"
          subtitle="클릭 한 번당 지불하는 평균 금액"
          value={metrics?.cpc || 0}
          format="currency"
          benchmarks={{
            good: 500,
            average: 1000,
            poor: 2000
          }}
          isLowerBetter={true}
          advice={{
            good: "비용 효율이 아주 좋아요! 현재 타겟팅과 입찰 전략이 적절합니다.",
            average: "평균적인 비용이에요. 입찰 전략을 최적화하거나 품질 점수를 개선해보세요.",
            poor: "비용이 높아요. 경쟁이 낮은 키워드를 찾거나, 타겟 범위를 조정해보세요."
          }}
        />
        <PerformanceMetricCard
          title="광고 수익률 (ROAS)"
          subtitle="광고비 1원당 발생한 매출"
          value={metrics?.roas || 0}
          format="multiplier"
          benchmarks={{
            good: 4.0,
            average: 2.5,
            poor: 1.5
          }}
          advice={{
            good: "대단해요! 광고가 매출에 크게 기여하고 있습니다. 예산을 늘려볼 만해요.",
            average: "수익이 나고 있어요. 전환율이 높은 상품에 예산을 집중하면 더 좋아질 거예요.",
            poor: "수익성 개선이 필요해요. 광고 대상 상품이나 서비스를 재검토해보세요."
          }}
        />
      </div>

      {/* Channel Performance + AI Agent Side-by-Side */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* 채널별 성과 (왼쪽 3/5) */}
        <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">채널별 성과</h2>
            <p className="text-sm text-gray-600 mt-1">각 광고 플랫폼의 실시간 성과를 확인하세요</p>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {performance?.data?.performance?.map((channel: any) => (
                <div key={channel.platform} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPlatformBgColor(channel.platform)}`}>
                        {getPlatformIcon(channel.platform)}
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900 capitalize">{channel.platform}</h3>
                        <p className="text-sm text-gray-500">{channel.campaigns}개 캠페인 진행 중</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">노출수</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCompactNumber(channel.metrics.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">클릭수</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCompactNumber(channel.metrics.clicks)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">CTR</p>
                      <p className="text-lg font-semibold text-gray-900">{formatPercent(channel.metrics.ctr)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">ROAS</p>
                      <p className="text-lg font-semibold text-green-600">{(channel.metrics?.roas ?? 0).toFixed(2)}x</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!performance?.data?.performance || performance.data.performance.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p>연동된 채널의 성과 데이터가 아직 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI 마케팅 에이전트 (오른쪽 2/5) */}
        <div className="xl:col-span-2 space-y-4">
          {/* AI 에이전트 헤더 */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">AI 마케팅 에이전트</h2>
                <p className="text-sm text-white/80">광고 데이터 기반 예산 최적화</p>
              </div>
            </div>
            <p className="text-sm text-white/70 mb-4">
              실제 광고 성과를 분석하여 플랫폼별 예산 배분과 액션을 추천합니다.
            </p>
            <button
              onClick={handleRunAgent}
              disabled={analyzeMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-indigo-700 font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  에이전트 분석 실행
                </>
              )}
            </button>
          </div>

          {/* 분석 결과 */}
          {agentData && (
            <>
              {/* 종합 인사이트 */}
              <div className={`rounded-xl shadow-sm border-2 p-5 ${
                agentData.overallInsight.riskLevel === 'high' 
                  ? 'bg-red-50 border-red-200' 
                  : agentData.overallInsight.riskLevel === 'medium'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {agentData.overallInsight.riskLevel === 'high' ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : agentData.overallInsight.riskLevel === 'medium' ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                  )}
                  <span className={`text-sm font-semibold ${
                    agentData.overallInsight.riskLevel === 'high' ? 'text-red-700'
                    : agentData.overallInsight.riskLevel === 'medium' ? 'text-yellow-700'
                    : 'text-green-700'
                  }`}>
                    리스크: {agentData.overallInsight.riskLevel === 'high' ? '높음' : agentData.overallInsight.riskLevel === 'medium' ? '보통' : '낮음'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{agentData.overallInsight.summary}</p>
                
                {agentData.overallInsight.keyFindings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {agentData.overallInsight.keyFindings.map((f: string, i: number) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                        {f}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* 플랫폼별 추천 액션 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-500" />
                    추천 액션
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {agentData.recommendations?.map((rec: any) => (
                    <div key={rec.platform} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getPlatformBgColor(rec.platform)}`}>
                            {getPlatformIcon(rec.platform)}
                          </div>
                          <span className="font-semibold text-gray-900 capitalize text-sm">{rec.platform}</span>
                        </div>
                        <ActionBadge action={rec.action} />
                      </div>
                      
                      {/* 예산 변동 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500">예산:</span>
                        <span className="text-xs text-gray-700">{formatCurrency(rec.currentBudget)}</span>
                        <span className="text-xs text-gray-400">→</span>
                        <span className={`text-xs font-semibold ${
                          rec.budgetChange > 0 ? 'text-green-600' : rec.budgetChange < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {formatCurrency(rec.recommendedBudget)}
                          {rec.budgetChangePercent !== 0 && (
                            <span className="ml-1">
                              ({rec.budgetChangePercent > 0 ? '+' : ''}{rec.budgetChangePercent}%)
                            </span>
                          )}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600 leading-relaxed">{rec.reason}</p>
                      <p className="text-xs text-purple-600 mt-1 font-medium">{rec.expectedImpact}</p>
                    </div>
                  ))}
                  {(!agentData.recommendations || agentData.recommendations.length === 0) && (
                    <div className="p-6 text-center text-sm text-gray-500">
                      분석할 플랫폼 데이터가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 실행 항목 */}
              {agentData.overallInsight.actionItems.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">📋 실행 체크리스트</h3>
                  <div className="space-y-2">
                    {agentData.overallInsight.actionItems.map((action: string, i: number) => (
                      <label key={i} className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer group">
                        <input type="checkbox" className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="group-hover:text-gray-900">{action}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 분석 미실행 시 안내 */}
          {!agentData && !analyzeMutation.isPending && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">아직 분석이 실행되지 않았습니다</p>
              <p className="text-xs text-gray-400">상단 버튼을 눌러 AI 에이전트를 실행하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* Budget Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">예산 현황</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">총 예산</span>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(budget?.total || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">사용 예산</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(budget?.spent || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">잔여 예산</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(budget?.remaining || 0)}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="pt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>예산 사용률</span>
                <span className="font-medium">{formatPercent(budget?.utilizationRate || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(budget?.utilizationRate || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// PerformanceMetricCard Component with Benchmarks
interface PerformanceMetricCardProps {
  title: string;
  subtitle: string;
  value: number;
  format: 'percent' | 'currency' | 'multiplier';
  benchmarks: {
    good: number;
    average: number;
    poor: number;
  };
  isLowerBetter?: boolean;
  advice: {
    good: string;
    average: string;
    poor: string;
  };
}

function PerformanceMetricCard({ 
  title, 
  subtitle, 
  value, 
  format, 
  benchmarks,
  isLowerBetter = false,
  advice 
}: PerformanceMetricCardProps) {
  // 성과 등급 계산
  const getPerformanceLevel = () => {
    if (isLowerBetter) {
      if (value <= benchmarks.good) return 'good';
      if (value <= benchmarks.average) return 'average';
      return 'poor';
    } else {
      if (value >= benchmarks.good) return 'good';
      if (value >= benchmarks.average) return 'average';
      return 'poor';
    }
  };

  const level = getPerformanceLevel();
  
  // 색상 설정
  const colors = {
    good: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: 'text-green-700 bg-green-100'
    },
    average: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      dot: 'bg-yellow-500',
      label: 'text-yellow-700 bg-yellow-100'
    },
    poor: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: 'text-red-700 bg-red-100'
    }
  };

  const levelLabels = {
    good: '좋음',
    average: '보통',
    poor: '개선필요'
  };

  // 값 포맷팅
  const formatValue = () => {
    switch (format) {
      case 'percent':
        return formatPercent(value);
      case 'currency':
        return formatCurrency(value);
      case 'multiplier':
        return `${value.toFixed(2)}x`;
      default:
        return value.toString();
    }
  };

  return (
    <div className={`relative bg-white rounded-xl shadow-sm border-2 ${colors[level].border} p-6 transition-all hover:shadow-lg group`}>
      {/* Tooltip on hover */}
      <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-semibold mb-1">💡 전략 조언</p>
            <p className="text-gray-200 leading-relaxed">{advice[level]}</p>
          </div>
        </div>
        {/* Arrow */}
        <div className="absolute bottom-full left-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900"></div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors[level].label}`}>
          <div className={`w-2 h-2 rounded-full ${colors[level].dot} animate-pulse`}></div>
          {levelLabels[level]}
        </div>
        <div className="text-xs text-gray-400">마우스를 올려보세요 👆</div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-4">{subtitle}</p>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <p className={`text-4xl font-bold ${colors[level].text}`}>{formatValue()}</p>
      </div>

      {/* Benchmark Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">기준</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">나쁨</span>
            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${colors[level].dot} transition-all duration-500`}
                style={{
                  width: `${Math.min(100, (value / (isLowerBetter ? benchmarks.poor * 1.5 : benchmarks.good * 1.5)) * 100)}%`
                }}
              />
            </div>
            <span className="text-gray-400">좋음</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// MetricCard Component
interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: any;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

function MetricCard({ title, value, change, icon: Icon, color }: MetricCardProps) {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  };

  const isPositive = change && change > 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${colors[color].border} p-6 transition hover:shadow-md`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors[color].bg}`}>
          <Icon className={`w-6 h-6 ${colors[color].text}`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ActionBadge Component for AI Agent recommendations
function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    increase: { label: '예산 증액', bg: 'bg-green-100', text: 'text-green-700', icon: TrendingUp },
    decrease: { label: '예산 감축', bg: 'bg-orange-100', text: 'text-orange-700', icon: TrendingDown },
    pause: { label: '집행 중단', bg: 'bg-red-100', text: 'text-red-700', icon: Pause },
    maintain: { label: '현행 유지', bg: 'bg-blue-100', text: 'text-blue-700', icon: ShieldCheck },
  };

  const c = config[action] || config.maintain;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

// Helper functions
function getPlatformBgColor(platform: string) {
  const colors: Record<string, string> = {
    google: 'bg-red-50',
    meta: 'bg-blue-50',
    naver: 'bg-green-50',
  };
  return colors[platform.toLowerCase()] || 'bg-gray-50';
}

function getPlatformIcon(platform: string) {
  const iconClass = "w-5 h-5 font-bold";
  const colors: Record<string, string> = {
    google: 'text-red-600',
    meta: 'text-blue-600',
    naver: 'text-green-600',
  };
  const color = colors[platform.toLowerCase()] || 'text-gray-600';
  
  return <span className={`${iconClass} ${color}`}>{platform[0].toUpperCase()}</span>;
}
