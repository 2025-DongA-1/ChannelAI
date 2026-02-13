import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignAPI } from '@/lib/api';
import { formatCurrency, formatPercent, formatCompactNumber } from '@/lib/utils';
import {
  ArrowLeft,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Target,
  Calendar,
  Edit,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // 캠페인 상세 정보
  const { data: campaignData, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignAPI.getCampaign(Number(id)),
    enabled: !!id,
  });

  // 캠페인 메트릭
  const { data: metricsData } = useQuery({
    queryKey: ['campaign-metrics', id, dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      campaignAPI.getMetrics(Number(id)),
    enabled: !!id,
  });

  const campaign = campaignData?.data?.campaign;
  const metrics = metricsData?.data?.metrics || [];

  // 캠페인 상태 변경
  const updateMutation = useMutation({
    mutationFn: (data: any) => campaignAPI.updateCampaign(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      alert('캠페인이 업데이트되었습니다.');
    },
    onError: () => {
      alert('캠페인 업데이트에 실패했습니다.');
    },
  });

  // 캠페인 삭제
  const deleteMutation = useMutation({
    mutationFn: () => campaignAPI.deleteCampaign(Number(id)),
    onSuccess: () => {
      alert('캠페인이 삭제되었습니다.');
      navigate('/campaigns');
    },
    onError: () => {
      alert('캠페인 삭제에 실패했습니다.');
    },
  });

  const handleStatusToggle = () => {
    if (!campaign) return;
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    updateMutation.mutate({ status: newStatus });
  };

  const handleDelete = () => {
    if (confirm('정말로 이 캠페인을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteMutation.mutate();
    }
  };

  // 차트 데이터 준비 (PostgreSQL Decimal 타입을 Number로 변환)
  const chartData = metrics
    .sort((a: any, b: any) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime())
    .map((m: any) => ({
      date: new Date(m.metric_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      노출수: Number(m.impressions) || 0,
      클릭수: Number(m.clicks) || 0,
      전환수: Number(m.conversions) || 0,
      비용: Number(m.cost) || 0,
    }));

  // 총합 계산 (PostgreSQL Decimal 타입을 Number로 변환)
  const totals = metrics.reduce(
    (acc: any, m: any) => ({
      impressions: acc.impressions + (Number(m.impressions) || 0),
      clicks: acc.clicks + (Number(m.clicks) || 0),
      conversions: acc.conversions + (Number(m.conversions) || 0),
      cost: acc.cost + (Number(m.cost) || 0),
      revenue: acc.revenue + (Number(m.revenue) || 0),
    }),
    { impressions: 0, clicks: 0, conversions: 0, cost: 0, revenue: 0 }
  );

  const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCPC = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
  const roas = totals.cost > 0 ? totals.revenue / totals.cost : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">캠페인을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'meta':
        return 'bg-blue-100 text-blue-700';
      case 'google':
        return 'bg-red-100 text-red-700';
      case 'naver':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/campaigns')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.campaign_name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getPlatformColor(campaign.platform)}`}>
                {campaign.platform}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                {campaign.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleStatusToggle}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {campaign.status === 'active' ? (
              <>
                <Pause className="w-4 h-4" />
                일시정지
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                재개
              </>
            )}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Edit className="w-4 h-4" />
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">캠페인 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">일일 예산</p>
            <p className="font-medium text-gray-900">{formatCurrency(campaign.daily_budget || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">총 예산</p>
            <p className="font-medium text-gray-900">{formatCurrency(campaign.total_budget || 0)}</p>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-700">분석 기간:</span>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            max={dateRange.endDate}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
          />
          <span>~</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            min={dateRange.startDate}
            max={new Date().toISOString().split('T')[0]}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">총 노출수</p>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCompactNumber(totals.impressions)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">총 클릭수</p>
            <MousePointerClick className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCompactNumber(totals.clicks)}</p>
          <p className="text-sm text-gray-500 mt-1">CTR: {avgCTR.toFixed(2)}%</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">총 광고비</p>
            <DollarSign className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.cost)}</p>
          <p className="text-sm text-gray-500 mt-1">CPC: {formatCurrency(avgCPC)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">총 전환수</p>
            <Target className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCompactNumber(totals.conversions)}</p>
          <p className="text-sm text-gray-500 mt-1">ROAS: {roas.toFixed(2)}x</p>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">성과 추이</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="노출수" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="클릭수" stroke="#10b981" strokeWidth={2} />
            <Line type="monotone" dataKey="전환수" stroke="#8b5cf6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Metrics Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">일별 성과 데이터</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">노출수</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">클릭수</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">전환수</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">비용</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">CPC</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {metrics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                metrics.map((metric: any) => (
                  <tr key={metric.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(metric.metric_date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCompactNumber(Number(metric.impressions) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCompactNumber(Number(metric.clicks) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatPercent(Number(metric.impressions) > 0 ? (Number(metric.clicks) / Number(metric.impressions)) * 100 : 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCompactNumber(metric.conversions || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(Number(metric.cost) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(Number(metric.clicks) > 0 ? Number(metric.cost) / Number(metric.clicks) : 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {Number(metric.cost) > 0 ? `${(Number(metric.revenue) / Number(metric.cost)).toFixed(2)}x` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
