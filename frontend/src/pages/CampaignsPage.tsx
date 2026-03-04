import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { campaignAPI, budgetAPI } from '@/lib/api';
import { formatCurrency, formatPercent, getStatusColor, getPlatformColor } from '@/lib/utils';
import { Plus, Search, Filter, RefreshCw, TrendingUp, AlertTriangle, Edit, Check, X, Trash2 } from 'lucide-react';
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

  const [isTotalBudgetModalOpen, setIsTotalBudgetModalOpen] = useState(false);
  const [newTotalBudget, setNewTotalBudget] = useState('');
  // 🌟 [변수 정의 추가] 일일 예산을 관리할 새로운 상태 변수를 선언합니다.
  const [newDailyBudget, setNewDailyBudget] = useState('');

  const updateTotalBudgetMutation = useMutation({
    // 🌟 [수정] 객체 형태로 totalBudget과 dailyBudget을 모두 전송합니다.
    mutationFn: (data: { totalBudget: number; dailyBudget: number }) => 
      budgetAPI.updateTotalBudget(data),
    onSuccess: () => {
      // 성공 시 대시보드 요약 쿼리를 무효화하여 화면을 최신화합니다.
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      setIsTotalBudgetModalOpen(false);
      alert('전체 및 일일 예산 설정이 업데이트되었습니다! 💰');
    },
    onError: () => alert('예산 설정에 실패했습니다. 다시 시도해 주세요.'),
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

  // 👇 캠페인 삭제 Mutation 추가!
  const deleteMutation = useMutation({
    mutationFn: (id: number) => campaignAPI.deleteCampaign(id),
    onSuccess: () => {
      // 삭제 후 화면의 모든 데이터를 최신화합니다!
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['budget-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      queryClient.invalidateQueries({ queryKey: ['budget-platforms'] });
      alert('캠페인이 성공적으로 삭제되었습니다. 🗑️');
    },
    onError: () => {
      alert('캠페인 삭제에 실패했습니다.');
    },
  });

  // 👇 삭제 버튼 클릭 시 실행될 함수 추가!
  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`'${name}' 캠페인을 정말 삭제하시겠습니까?\n관련된 성과 데이터도 모두 함께 삭제됩니다.`)) {
      deleteMutation.mutate(id);
    }
  };

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
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['campaigns'] });
              queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
              queryClient.invalidateQueries({ queryKey: ['budget-platforms'] });
              queryClient.invalidateQueries({ queryKey: ['budget-campaigns'] });
            }}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <Link 
            to="/integration"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            새 캠페인 추가 (연동)
          </Link>
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
            {/* 👇 누르면 모달이 열리는 연필 아이콘 버튼 추가! */}
            <button 
              onClick={() => {
                setNewTotalBudget(String(summary?.totalBudget || 0));
                setIsTotalBudgetModalOpen(true);
              }}
              className="p-1 hover:bg-blue-50 rounded-full transition"
            >
              <Edit className="w-4 h-4 text-blue-500" />
            </button>
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
            {/* 🌟 [수정 버튼 추가] 클릭 시 전체 예산과 일일 예산 값을 모달 상태에 미리 채워넣습니다. */}
            <button 
              onClick={() => {
                setNewTotalBudget(String(summary?.totalBudget || 0));
                setNewDailyBudget(String(summary?.dailyBudget || 0));
                setIsTotalBudgetModalOpen(true);
              }}
              className="p-1 hover:bg-purple-50 rounded-full transition"
            >
              <Edit className="w-4 h-4 text-purple-500" />
            </button>
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    진행 기간
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 집행액
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 수익
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROAS
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전환수 (CPA)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    클릭수 (CPC)
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.map((campaign: any) => {
                  const roas = campaign.total_cost > 0 ? (campaign.total_revenue / campaign.total_cost) * 100 : 0;
                  const cpa = campaign.total_conversions > 0 ? campaign.total_cost / campaign.total_conversions : 0;
                  const cpc = campaign.total_clicks > 0 ? campaign.total_cost / campaign.total_clicks : 0;
                  
                  // 날짜 포맷 (예: 26.02.01 ~ 26.02.28)
                  const formatDateStr = (dateStr: string) => {
                    if (!dateStr) return '-';
                    const d = new Date(dateStr);
                    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                  };
                  
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
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlatformColor(campaign.platform)}`}>
                          {campaign.platform.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {campaign.status === 'active' ? '활성' : campaign.status === 'paused' ? '일시정지' : '완료'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-500">
                        {formatDateStr(campaign.start_date)} ~ {formatDateStr(campaign.end_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(campaign.total_cost || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                        {formatCurrency(campaign.total_revenue || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${roas >= 200 ? 'text-green-700 bg-green-50 border border-green-200' : 'text-gray-700'}`}>
                          {roas > 0 ? `${(roas / 100).toFixed(2)}x` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-700">
                        <div className="font-medium">{campaign.total_conversions || 0}건</div>
                        <div className="text-xs text-gray-400 mt-0.5">({formatCurrency(cpa)})</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-700">
                        <div className="font-medium">{campaign.total_clicks || 0}회</div>
                        <div className="text-xs text-gray-400 mt-0.5">({formatCurrency(cpc)})</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(campaign.id, campaign.campaign_name)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                          title="캠페인 삭제"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        {isTotalBudgetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">전체 예산 설정 💰</h3>
            <p className="text-gray-600 mb-6 text-sm">
              회사의 전체 광고 집행 목표 예산을 설정해 주세요.<br/>
              설정된 금액을 기준으로 소진율이 계산됩니다.
            </p>
            
            <div className="space-y-4 mb-6">
              {/* 전체 예산 입력창 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">전체 목표 금액 (원)</label>
                <input
                  type="number"
                  value={newTotalBudget}
                  onChange={(e) => setNewTotalBudget(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-semibold"
                />
              </div>
              
              {/* 🌟 [일일 예산 입력창 추가] */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">일일 목표 예산 (원)</label>
                <input
                  type="number"
                  value={newDailyBudget}
                  onChange={(e) => setNewDailyBudget(e.target.value)}
                  placeholder="하루 소진 권장 금액"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-semibold"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsTotalBudgetModalOpen(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                취소
              </button>
              <button
                // 🌟 [저장 로직 수정] 두 개의 상태값을 객체로 묶어서 Mutation을 실행합니다.
                onClick={() => updateTotalBudgetMutation.mutate({ 
                  totalBudget: Number(newTotalBudget), 
                  dailyBudget: Number(newDailyBudget) 
                })}
                disabled={updateTotalBudgetMutation.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {updateTotalBudgetMutation.isPending ? '저장 중...' : '설정하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
