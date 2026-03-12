import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { campaignAPI, budgetAPI } from '@/lib/api';
import { formatCurrency, formatPercent, getStatusColor, getPlatformColor } from '@/lib/utils';
import { Plus, Search, Filter, RefreshCw, TrendingUp, AlertTriangle, Edit, Trash2, Send, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useTutorialStore } from '../store/tutorialStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const TOUR_STEPS = [
  {
    targetId: 'tour-budget',
    title: '전체/일일 예산 관리 💰',
    description: '우측 상단의 연필 아이콘을 클릭하여 캠페인 진행에 필요한 전체 및 일일 예산을 수정하고 관리할 수 있습니다.',
  },
  {
    targetId: 'tour-campaign-list',
    title: '캠페인 상세 정보 확인 🔍',
    description: '캠페인 목록에서 등록된 캠페인명을 클릭하면 해당 캠페인의 상세한 성과 정보를 확인할 수 있습니다.',
  }
];

export default function CampaignsPage() {
  const { isTutorialModeEnabled } = useTutorialStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [isTotalBudgetModalOpen, setIsTotalBudgetModalOpen] = useState(false);
  const [newTotalBudget, setNewTotalBudget] = useState('');
  // 🌟 [변수 정의 추가] 일일 예산을 관리할 새로운 상태 변수를 선언합니다.
  const [newDailyBudget, setNewDailyBudget] = useState('');

  // --- 튜토리얼 상태 추가 ---
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [targetRect, setTargetRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('tour_done_campaigns');
    if (isTutorialModeEnabled) {
      setShowTour(true);
    } else if (!hasSeen) {
      setShowTour(true);
      localStorage.setItem('tour_done_campaigns', 'true');
    } else {
      setShowTour(false);
    }
  }, [isTutorialModeEnabled]);

  useEffect(() => {
    if (!showTour) return;

    const updateRect = () => {
      const step = TOUR_STEPS[tourStep];
      if (!step) return;

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      let targetId = step.targetId;

      // 모바일 버전 스텝 1은 전체 예산 클래스에 한정
      if (isMobile && tourStep === 0) {
        targetId = 'tour-total-budget';
      }

      const el = document.getElementById(targetId);
      if (el) {
        const rect = el.getBoundingClientRect();

        // 화면 밖에 있으면 스크롤 이동 후 rect 재계산
        if (rect.top < 60 || rect.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            const newRect = el.getBoundingClientRect();
            let h = newRect.height;
            if (isMobile && h > window.innerHeight * 0.7) h = window.innerHeight * 0.7;
            setTargetRect({ x: newRect.left - 8, y: newRect.top - 8, w: newRect.width + 16, h: h + 16 });
          }, 400);
        } else {
          let h = rect.height;
          if (isMobile && h > window.innerHeight * 0.7) h = window.innerHeight * 0.7;
          setTargetRect({ x: rect.left - 8, y: rect.top - 8, w: rect.width + 16, h: h + 16 });
        }
      }
    };

    updateRect();
    window.addEventListener('scroll', updateRect);
    window.addEventListener('resize', updateRect);
    const timer = setTimeout(updateRect, 300);

    return () => {
      window.removeEventListener('scroll', updateRect);
      window.removeEventListener('resize', updateRect);
      clearTimeout(timer);
    };
  }, [showTour, tourStep]);

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

  const { data, isLoading } = useQuery({
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

  // 예산 수정 (현재 미사용 처리됨. 향후 필요 시 주석 해제하여 사용)
  // const updateMutation = useMutation({
  //   mutationFn: ({ id, data }: { id: number; data: any }) => budgetAPI.updateCampaignBudget(id, data),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['budget-campaigns'] });
  //     queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
  //     queryClient.invalidateQueries({ queryKey: ['budget-platforms'] });
  //     queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  //     queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  //     alert('예산이 수정되었습니다.');
  //   },
  //   onError: () => {
  //     alert('예산 수정에 실패했습니다.');
  //   },
  // });

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

  // 필터링
  const filteredCampaigns = campaigns.filter((campaign: any) => {
    const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || campaign.platform === platformFilter;
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  // 차트 데이터 (platforms 매핑)
  const chartData = platforms.map((p: any) => ({
    name: p.platform.toUpperCase(),
    value: p.spent,
  }));

  // 예산 소진율에 따른 색상 반환 (원래 미사용 되어 주석 처리)
  // const getUtilizationColor = (rate: number) => {
  //   if (rate >= 90) return 'text-red-600 bg-red-50';
  //   if (rate >= 70) return 'text-yellow-600 bg-yellow-50';
  //   return 'text-green-600 bg-green-50';
  // };

  return (
    <>
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
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
      <div id="tour-budget" className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
        <div id="tour-total-budget" className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
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
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">집행 금액</p>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalSpent || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">
            소진율: {formatPercent(summary?.utilizationRate || 0)}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">잔여 예산</p>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.remaining || 0)}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
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
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
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
      <div id="tour-campaign-list" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
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

    {/* --- 튜토리얼 오버레이 (메인 div 바깥, 네비게이션 위에 렌더링) --- */}
    {showTour && TOUR_STEPS[tourStep] && (
      <div className="fixed inset-0 z-[100] pointer-events-auto">
        {/* SVG Mask for Hole-Punch Effect */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="tour-campaigns-hole">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.x}
                  y={targetRect.y}
                  width={targetRect.w}
                  height={targetRect.h}
                  fill="black"
                  rx="12"
                  className="transition-all duration-500 ease-in-out"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#tour-campaigns-hole)"
            className="transition-all duration-500"
          />
        </svg>

        {/* 하이라이트된 영역 툴팁 */}
        {targetRect && (
          <div
            className="absolute z-[101] transition-all duration-500 ease-in-out"
            style={{
              ...(() => {
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
                const boxWidth = Math.min(320, screenWidth - 32);
                let leftPos = targetRect.x + targetRect.w / 2 - boxWidth / 2;
                leftPos = Math.max(16, Math.min(leftPos, screenWidth - boxWidth - 16));

                if (tourStep === 1) {
                  // 스텝 2: 캠페인 목록 테이블 → 스포트라이트 상단에 배치
                  return { top: Math.max(16, targetRect.y - (isMobile ? 170 : 180)), left: leftPos, width: boxWidth };
                }
                // 스텝 1: 예산카드 → 스포트라이트 하단
                return { top: targetRect.y + targetRect.h + 16, left: leftPos, width: boxWidth };
              })()
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-5 relative animate-in fade-in zoom-in duration-300">
              {/* 꼬리표 */}
              <div className={`absolute w-4 h-4 bg-white rotate-45 transition-all duration-300 ${
                tourStep === 1
                  ? "-bottom-2 left-1/2 -translate-x-1/2"
                  : "-top-2 left-1/2 -translate-x-1/2"
              }`} />

              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                    {tourStep + 1}
                  </div>
                  <span className="font-bold text-gray-900 text-lg">
                    {TOUR_STEPS[tourStep].title}
                  </span>
                </div>

                <p className="text-gray-600 text-sm sm:text-base leading-relaxed break-keep">
                  {TOUR_STEPS[tourStep].description}
                </p>

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-400">
                    {tourStep + 1} / {TOUR_STEPS.length}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTour(false)}
                      className="px-3 py-1.5 text-xs sm:text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      건너뛰기
                    </button>

                    {tourStep < TOUR_STEPS.length - 1 ? (
                      <button
                        onClick={() => setTourStep(prev => prev + 1)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        다음 <Send className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowTour(false)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        시작하기 <CheckCircle2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
    </>
  );
}
