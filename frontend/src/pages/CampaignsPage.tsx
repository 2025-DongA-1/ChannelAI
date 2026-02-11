import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { campaignAPI, budgetAPI } from '@/lib/api';
import { formatCurrency, formatDate, formatPercent, getStatusColor, getPlatformColor } from '@/lib/utils';
import { Plus, Search, Filter, RefreshCw, DollarSign, TrendingUp, AlertTriangle, Edit, Check, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [editingCampaign, setEditingCampaign] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ dailyBudget: string; totalBudget: string }>({
    dailyBudget: '',
    totalBudget: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignAPI.getCampaigns(),
  });

  // 예산 데이터
  const { data: summaryData } = useQuery({
    queryKey: ['budget-summary', dateRange.startDate, dateRange.endDate],
    queryFn: () => budgetAPI.getSummary({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
  });

  const { data: platformsData } = useQuery({
    queryKey: ['budget-platforms', dateRange.startDate, dateRange.endDate],
    queryFn: () => budgetAPI.getByPlatform({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
  });

  const { data: campaignsData } = useQuery({
    queryKey: ['budget-campaigns', platformFilter, dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      budgetAPI.getByCampaign({
        platform: platformFilter === 'all' ? undefined : platformFilter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
  });

  // 예산 수정
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => budgetAPI.updateCampaignBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      queryClient.invalidateQueries({ queryKey: ['budget-platforms'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setEditingCampaign(null);
      alert('예산이 수정되었습니다.');
    },
    onError: () => {
      alert('예산 수정에 실패했습니다.');
    },
  });

  const campaigns = data?.data?.campaigns || [];
  const summary = summaryData?.data?.summary;
  const platforms = platformsData?.data?.platforms || [];
  const budgetCampaigns = campaignsData?.data?.campaigns || [];

  // 필터링
  const filteredCampaigns = campaigns.filter((campaign: any) => {
    const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || campaign.platform === platformFilter;
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  // 차트 데이터
  const chartData = platforms.map((p: any) => ({
    name: p.platform.toUpperCase(),
    value: p.spent,
  }));

  const handleEdit = (campaign: any) => {
    setEditingCampaign(campaign.id);
    setEditValues({
      dailyBudget: campaign.dailyBudget.toString(),
      totalBudget: campaign.totalBudget.toString(),
    });
  };

  const handleSave = (id: number) => {
    updateMutation.mutate({
      id,
      data: {
        dailyBudget: parseFloat(editValues.dailyBudget),
        totalBudget: parseFloat(editValues.totalBudget),
      },
    });
  };

  const handleCancel = () => {
    setEditingCampaign(null);
    setEditValues({ dailyBudget: '', totalBudget: '' });
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 bg-red-50';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">캠페인 & 예산 관리</h1>
          <p className="text-gray-600 mt-1">모든 플랫폼의 캠페인과 예산을 한곳에서 관리하세요</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-5 h-5 mr-2" />
            캠페인 생성
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="캠페인 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Platform Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">모든 플랫폼</option>
              <option value="google">Google Ads</option>
              <option value="meta">Meta Ads</option>
              <option value="naver">Naver Ads</option>
              <option value="karrot">Karrot Ads</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">모든 상태</option>
              <option value="active">활성</option>
              <option value="paused">일시정지</option>
              <option value="completed">완료</option>
            </select>
          </div>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">전체 예산</p>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalBudget || 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">집행 금액</p>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalSpent || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">
            소진율: {formatPercent(summary?.utilizationRate || 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">잔여 예산</p>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.remaining || 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">일일 예산</p>
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.dailyBudget || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">활성 {summary?.activeCampaigns || 0}개</p>
        </div>
      </div>

      {/* Platform Budget Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">플랫폼별 예산 분배</h2>
        {platforms.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 py-8">데이터가 없습니다.</p>
        )}
      </div>

      {/* Campaign Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">전체 캠페인</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{campaigns.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">활성 캠페인</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {campaigns.filter((c: any) => c.status === 'active').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">일시정지</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {campaigns.filter((c: any) => c.status === 'paused').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">완료</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">
            {campaigns.filter((c: any) => c.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Campaigns Table with Budget */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">캠페인 목록</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">캠페인이 없습니다</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || platformFilter !== 'all' || statusFilter !== 'all'
                ? '검색 조건에 맞는 캠페인이 없습니다.'
                : '새 캠페인을 생성하거나 광고 플랫폼을 연동하세요.'}
            </p>
            <Link
              to="/integration"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              플랫폼 연동하기
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    캠페인명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    플랫폼
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    일일 예산
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 예산
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    집행액
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    소진율
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROAS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    기간
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.map((campaign: any) => {
                  // budgetCampaigns에서 예산 정보 찾기
                  const budgetInfo = budgetCampaigns.find((bc: any) => bc.id === campaign.id) || {};
                  
                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          {campaign.campaign_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlatformColor(campaign.platform)}`}>
                          {campaign.platform.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {campaign.status === 'active' ? '활성' : campaign.status === 'paused' ? '일시정지' : '완료'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {editingCampaign === campaign.id ? (
                          <input
                            type="number"
                            value={editValues.dailyBudget}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, dailyBudget: e.target.value }))}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded text-right"
                          />
                        ) : (
                          formatCurrency(campaign.daily_budget)
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {editingCampaign === campaign.id ? (
                          <input
                            type="number"
                            value={editValues.totalBudget}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, totalBudget: e.target.value }))}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded text-right"
                          />
                        ) : (
                          formatCurrency(campaign.total_budget)
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(budgetInfo.spent || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUtilizationColor(budgetInfo.utilizationRate || 0)}`}>
                          {(budgetInfo.utilizationRate || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {budgetInfo.roas ? `${budgetInfo.roas.toFixed(2)}x` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(campaign.start_date)}
                        {campaign.end_date && ` ~ ${formatDate(campaign.end_date)}`}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {editingCampaign === campaign.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSave(campaign.id)}
                              disabled={updateMutation.isPending}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="저장"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="취소"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit({ id: campaign.id, dailyBudget: campaign.daily_budget, totalBudget: campaign.total_budget })}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="예산 수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
