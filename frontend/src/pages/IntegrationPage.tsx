  // ...existing code...
  // ...existing code...
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, accountAPI, integrationAPI } from '@/lib/api';
import { Link2, CheckCircle, XCircle, RefreshCw, AlertCircle, UploadCloud, FileSpreadsheet, Key, X, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IntegrationPage() {
  // 수정 상태 관리 (반드시 함수 내부에서 선언)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // 수정 mutation
  const updateKarrotManualMutation = useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: number; data: any }) => integrationAPI.updateKarrotManualCampaign(campaignId, data),
    onSuccess: () => {
      refetchKarrotCampaigns();
      setEditingId(null);
      alert('수정되었습니다.');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || '수정 실패');
    },
  });
  // 🥕 당근마켓 연동 입력값 상태는 반드시 컴포넌트 함수 내부에서 선언해야 함
  // (미사용) const [karrotUrl, setKarrotUrl] = useState('');
  // (미사용) const [karrotCookie, setKarrotCookie] = useState('');
    // 🥕 당근마켓 수동 입력 캠페인 목록
    const { data: karrotCampaignsData, refetch: refetchKarrotCampaigns } = useQuery({
      queryKey: ['karrot-manual-campaigns'],
      queryFn: async () => {
        // 모든 캠페인 중 platform이 'karrot'이고 external_campaign_id가 null/undefined/없는(즉, 수동입력) 것만 필터
        const res = await api.get('/campaigns', { params: { platform: 'karrot' } });
        return (res.data.campaigns || []).filter((c: any) => !c.external_campaign_id || c.external_campaign_id === '' || c.external_campaign_id === null);
      },
    });

    // 삭제 mutation
    const deleteKarrotManualMutation = useMutation({
      mutationFn: (campaignId: number) => integrationAPI.deleteKarrotManualCampaign(campaignId),
      onSuccess: () => {
        refetchKarrotCampaigns();
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        alert('삭제되었습니다.');
      },
      onError: (err: any) => {
        alert(err?.response?.data?.error || '삭제 실패');
      },
    });
  const [karrotLoading, setKarrotLoading] = useState(false);

  // 🥕 당근마켓 광고 수동 입력 상태
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [impressions, setImpressions] = useState('');
  const [reach, setReach] = useState('');
  const [clicks, setClicks] = useState('');
  const [ctr, setCtr] = useState('');
  const [cost, setCost] = useState('');
  const [cpc, setCpc] = useState('');
  const [revenue, setRevenue] = useState('');

  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 네이버 API 키 모달 상태
  const [showNaverModal, setShowNaverModal] = useState(false);
  const [naverForm, setNaverForm] = useState({
    apiKey: '',
    secretKey: '',
    customerId: '',
    accountName: ''
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountAPI.getAccounts(),
  });

  const accounts = accountsData?.data?.accounts || [];

  // CSV 업로드 Mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => integrationAPI.uploadCSV(file),
    onSuccess: (response) => {
        alert(`✅ 업로드 성공: ${response.data.message}`);
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: any) => {
        console.error('업로드 실패:', error);
        alert(error.response?.data?.error || 'CSV 업로드에 실패했습니다.');
    },
    onSettled: () => {
        setIsUploading(null as any);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm(`'${file.name}' 파일을 업로드하시겠습니까?`)) {
        setIsUploading(true);
        uploadMutation.mutate(file);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 동기화 mutation
  const syncAllMutation = useMutation({
    mutationFn: async (platform: string) => {
      setSyncing(platform);
      // 전체 기간 동기화: startDate, endDate를 빈 문자열로 전달
      await integrationAPI.syncAll({ startDate: '', endDate: '', platform });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert('동기화가 완료되었습니다!');
    },
    onError: (error: any) => {
      console.error('동기화 오류:', error);
      alert(error.response?.data?.error || '동기화에 실패했습니다.');
    },
    onSettled: () => {
      setSyncing(null);
    },
  });

  // 네이버 API 키 연동 mutation
  const naverConnectMutation = useMutation({
    mutationFn: (data: { apiKey: string; secretKey: string; customerId: string; accountName?: string }) =>
      integrationAPI.connectPlatform('naver', data),
    onSuccess: (response) => {
      alert(`✅ ${response.data.message}`);
      setShowNaverModal(false);
      setNaverForm({ apiKey: '', secretKey: '', customerId: '', accountName: '' });
      setConnectError(null);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (error: any) => {
      console.error('네이버 연동 오류:', error);
      setConnectError(error.response?.data?.message || '연동에 실패했습니다. API 키를 확인해주세요.');
    }
  });

  const handleConnect = async (platform: string) => {
    // 네이버는 API 키 모달을 띄움 (OAuth가 아닌 API Key 방식)
    if (platform === 'naver') {
      setShowNaverModal(true);
      setConnectError(null);
      return;
    }

    // 기타 플랫폼은 기존 OAuth 방식
    try {
      let authUrl: string;
      if (platform === 'karrot') {
        const response = await api.get(`/auth/karrot`);
        authUrl = response.data.authUrl;
      } else {
        const response = await integrationAPI.getAuthUrl(platform);
        authUrl = response.data.data.authUrl;
      }
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('연동 오류:', error);
      alert(error.response?.data?.error || '연동에 실패했습니다.');
    }
  };

  const handleNaverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!naverForm.apiKey || !naverForm.secretKey || !naverForm.customerId) {
      setConnectError('모든 필수 항목을 입력해주세요.');
      return;
    }
    naverConnectMutation.mutate(naverForm);
  };

  const handleSync = (platform: string) => {
    syncAllMutation.mutate(platform);
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`${platform.toUpperCase()} 계정 연동을 해제하시겠습니까?\n\n연동 해제 시 캠페인과 데이터가 모두 삭제됩니다.`)) {
      return;
    }

    try {
      await integrationAPI.disconnect(platform);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert('계정 연동이 해제되었습니다.');
    } catch (error: any) {
      console.error('연동 해제 오류:', error);
      alert(error.response?.data?.error || '연동 해제에 실패했습니다.');
    }
  };

  const platforms = [
    {
      id: 'google',
      name: 'Google Ads',
      description: 'Google 검색, 디스플레이, YouTube 광고',
      icon: '🔍',
      color: 'from-red-500 to-yellow-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      id: 'meta',
      name: 'Meta Ads',
      description: 'Facebook, Instagram 광고',
      icon: '📘',
      color: 'from-blue-500 to-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      id: 'naver',
      name: 'Naver Ads',
      description: '네이버 검색광고 (API Key 연동)',
      icon: '🟢',
      color: 'from-green-600 to-green-800',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
    {
      id: 'karrot',
      name: '당근마켓 비즈니스',
      description: '지역 기반 타겟 광고, 동네생활 마케팅',
      icon: '🥕',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
  ];

  const getAccountForPlatform = (platform: string) => {
    return accounts.find((acc: any) => acc.platform === platform);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">광고 플랫폼 연동</h1>
          <p className="text-gray-600 mt-1">
            Google, Meta, Naver 광고 계정을 연동하여 통합 관리하세요
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv" 
            className="hidden" 
          />
          <button
            onClick={triggerFileInput}
            disabled={isUploading}
            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-md w-full sm:w-auto disabled:opacity-50"
          >
            {isUploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            {isUploading ? '업로드 중...' : 'CSV 파일 직접 업로드'}
          </button>
          
          <Link 
            to="/dummy-data" 
            className="flex items-center justify-center px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200 font-medium hover:bg-indigo-100 transition w-full sm:w-auto"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            테스트 데이터 생성하기
          </Link>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">다양한 인증 방식 지원</p>
          <p>네이버는 API Key 입력으로, Google/Meta는 OAuth 2.0 으로 연동합니다. CSV 파일 업로드도 지원합니다.</p>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => {
          if (platform.id === 'karrot') return null; // 당근마켓은 별도 폼으로 처리
          const account = getAccountForPlatform(platform.id);
          const isConnected = !!account;
          const isSyncing = syncing === platform.id;
          return (
            <div
              key={platform.id}
              className={`bg-white rounded-xl shadow-sm border ${platform.borderColor} overflow-hidden transition hover:shadow-md`}
            >
              {/* Header */}
              <div className={`${platform.bgColor} p-6 border-b ${platform.borderColor}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`text-4xl w-16 h-16 flex items-center justify-center bg-gradient-to-br ${platform.color} rounded-xl`}>
                    <span className="text-white text-2xl">{platform.icon}</span>
                  </div>
                  {isConnected ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{platform.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{platform.description}</p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {isConnected ? (
                  <>
                    {/* Account Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">계정 ID</span>
                        <span className="font-medium text-gray-900">{account.account_id}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">계정명</span>
                        <span className="font-medium text-gray-900">{account.account_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">캠페인 수</span>
                        <span className="font-medium text-gray-900">{account.campaign_count || 0}개</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">마지막 동기화</span>
                        <span className="font-medium text-gray-900">
                          {account.last_sync_at
                            ? new Date(account.last_sync_at).toLocaleString('ko-KR')
                            : '동기화 안됨'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleSync(platform.id)}
                        disabled={isSyncing}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSyncing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            동기화 중...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            동기화
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => handleDisconnect(platform.id)}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                      >
                        연동 해제
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Not Connected */}
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600 mb-4">
                        {platform.name} 계정을 연동하여<br />
                        캠페인과 데이터를 가져오세요
                      </p>
                      <button
                        onClick={() => handleConnect(platform.id)}
                        className={`w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r ${platform.color} text-white rounded-lg hover:shadow-lg transition font-medium`}
                      >
                        <Link2 className="w-5 h-5 mr-2" />
                        {platform.name} 연동하기
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 당근마켓 광고 수동 입력 폼 */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mt-8">
        <h2 className="text-2xl font-bold text-orange-700 mb-2 flex items-center">
          🥕 당근마켓 광고 데이터 직접 입력
        </h2>
        <p className="text-sm text-orange-900 mb-4">
          당근마켓 간편 모드인 경우 광고센터에서 확인한 성과 데이터를 아래 입력란에 직접 입력해 주세요.<br />
          당근마켓 전문가 모드이거나 키워드 광고라면 해당 사이트에서 다운로드 받을 수 있는 엑셀 형태의 성과 보고서를 위에서 첨부해주세요.<br />
          AI 분석 및 대시보드 표출에 필요한 모든 항목을 빠짐없이 입력해야 정확한 분석이 가능합니다.<br />
          *당근마켓 간편 모드에서는 광고 기간 전체의 데이터만 제공되므로, 기간 내 집계 합산 수치를 일수에 따라 일별로 동일하게 나누어 계산됩니다.
        </p>
        <form className="space-y-4 max-w-xl" onSubmit={async e => {
          e.preventDefault();
          setKarrotLoading(true);
          try {
            const payload = {
              campaignName,
              subject,
              startDate,
              endDate,
              impressions: Number(impressions),
              reach: Number(reach),
              clicks: Number(clicks),
              ctr: Number(ctr),
              cost: Number(cost),
              cpc: Number(cpc),
            };
            const res = await integrationAPI.submitKarrotManual(payload);
            alert(res.data.message || '저장 성공!');
            refetchKarrotCampaigns();
            // 입력값 초기화
            setCampaignName(''); setSubject(''); setStartDate(''); setEndDate('');
            setImpressions(''); setReach(''); setClicks(''); setCtr(''); setCost(''); setCpc('');
          } catch (err: any) {
            alert(err?.response?.data?.error || '저장 실패');
          } finally {
            setKarrotLoading(false);
          }
        }}>
                {/* 🥕 수동 입력된 당근마켓 캠페인 목록 */}
                {karrotCampaignsData && karrotCampaignsData.length > 0 && (
                  <div className="bg-white border border-orange-200 rounded-xl p-4 mt-6">
                    <h3 className="text-lg font-bold text-orange-700 mb-2 flex items-center">🥕 수동 입력 캠페인 목록</h3>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-orange-50">
                          <th className="px-2 py-1">캠페인명</th>
                          <th className="px-2 py-1">기간</th>
                          <th className="px-2 py-1">노출</th>
                          <th className="px-2 py-1">클릭</th>
                          <th className="px-2 py-1">비용</th>
                          <th className="px-2 py-1">수입/매출</th>
                          <th className="px-2 py-1">액션</th>
                        </tr>
                      </thead>
                      <tbody>
                        {karrotCampaignsData.map((c: any) => (
                          <tr key={c.id} className="border-b">
                            {editingId === c.id ? (
                              <>
                                <td className="px-2 py-1">
                                  <input type="text" className="w-full border rounded px-1" value={editForm.campaignName ?? c.campaign_name} onChange={e => setEditForm((f: any) => ({ ...f, campaignName: e.target.value }))} />
                                </td>
                                <td className="px-2 py-1">
                                  <input type="date" className="border rounded px-1 mr-1" value={editForm.startDate ?? c.start_date} onChange={e => setEditForm((f: any) => ({ ...f, startDate: e.target.value }))} />
                                  ~
                                  <input type="date" className="border rounded px-1 ml-1" value={editForm.endDate ?? c.end_date} onChange={e => setEditForm((f: any) => ({ ...f, endDate: e.target.value }))} />
                                </td>
                                <td className="px-2 py-1 text-right">
                                  <input type="number" className="w-20 border rounded px-1" value={editForm.impressions ?? c.metrics?.impressions ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, impressions: e.target.value }))} />
                                </td>
                                <td className="px-2 py-1 text-right">
                                  <input type="number" className="w-20 border rounded px-1" value={editForm.clicks ?? c.metrics?.clicks ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, clicks: e.target.value }))} />
                                </td>
                                <td className="px-2 py-1 text-right">
                                  <input type="number" className="w-20 border rounded px-1" value={editForm.cost ?? c.metrics?.cost ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, cost: e.target.value }))} />
                                </td>
                                <td className="px-2 py-1 text-right">
                                  <input type="number" className="w-20 border rounded px-1" value={editForm.revenue ?? c.metrics?.revenue ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, revenue: e.target.value }))} placeholder="선택 입력" />
                                </td>
                                <td className="px-2 py-1">
                                  <button className="px-2 py-1 text-green-600 hover:underline mr-2" onClick={() => {
                                    updateKarrotManualMutation.mutate({
                                      campaignId: c.id,
                                      data: {
                                        campaignName: editForm.campaignName ?? c.campaign_name,
                                        subject: c.subject ?? '', // subject는 별도 관리 필요시 확장
                                        startDate: editForm.startDate ?? c.start_date,
                                        endDate: editForm.endDate ?? c.end_date,
                                        impressions: Number(editForm.impressions ?? c.metrics?.impressions ?? 0),
                                        reach: c.metrics?.reach ?? 0,
                                        clicks: Number(editForm.clicks ?? c.metrics?.clicks ?? 0),
                                        ctr: c.metrics?.ctr ?? 0,
                                        cost: Number(editForm.cost ?? c.metrics?.cost ?? 0),
                                        revenue: Number(editForm.revenue ?? c.metrics?.revenue ?? 0),
                                        cpc: c.metrics?.cpc ?? 0,
                                      },
                                    });
                                  }}>저장</button>
                                  <button className="px-2 py-1 text-gray-500 hover:underline" onClick={() => setEditingId(null)}>취소</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-2 py-1">{c.campaign_name}</td>
                                <td className="px-2 py-1">{c.start_date} ~ {c.end_date}</td>
                                <td className="px-2 py-1 text-right">{c.metrics?.impressions ?? '-'}</td>
                                <td className="px-2 py-1 text-right">{c.metrics?.clicks ?? '-'}</td>
                                <td className="px-2 py-1 text-right">{c.metrics?.cost ? c.metrics.cost.toLocaleString() : '-'}</td>
                                <td className="px-2 py-1 text-right">{c.metrics?.revenue ? c.metrics.revenue.toLocaleString() : '-'}</td>
                                <td className="px-2 py-1">
                                  <button
                                    className="px-2 py-1 text-blue-600 hover:underline mr-2"
                                    onClick={() => {
                                      setEditingId(c.id);
                                      setEditForm({
                                        campaignName: c.campaign_name,
                                        startDate: c.start_date,
                                        endDate: c.end_date,
                                        impressions: c.metrics?.impressions ?? '',
                                        clicks: c.metrics?.clicks ?? '',
                                        cost: c.metrics?.cost ?? '',
                                        revenue: c.metrics?.revenue ?? '',
                                      });
                                    }}
                                  >수정</button>
                                  <button
                                    className="px-2 py-1 text-red-600 hover:underline"
                                    onClick={() => {
                                      if (window.confirm('정말 삭제하시겠습니까?')) deleteKarrotManualMutation.mutate(c.id);
                                    }}
                                  >삭제</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
          <div>
            <label className="block text-sm font-medium text-orange-900 mb-1">캠페인명</label>
            <input type="text" required value={campaignName} onChange={e => setCampaignName(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-orange-900 mb-1">광고 소재</label>
            <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-orange-900 mb-1">광고 시작일</label>
              <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-orange-900 mb-1">광고 종료일</label>
              <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-orange-900 mb-1">노출수</label>
              <input type="number" required value={impressions} onChange={e => setImpressions(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-orange-900 mb-1">도달수</label>
              <input type="number" required value={reach} onChange={e => setReach(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-orange-900 mb-1">클릭수</label>
              <input type="number" required value={clicks} onChange={e => setClicks(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-orange-900 mb-1">클릭률(%)</label>
              <input type="number" step="0.01" required value={ctr} onChange={e => setCtr(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-orange-900 mb-1">총 지출(원)</label>
              <input type="number" required value={cost} onChange={e => setCost(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-orange-900 mb-1">총 수입/매출(원)</label>
              <input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="선택 입력" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-orange-900 mb-1">클릭당 지출(원)</label>
              <input type="number" required value={cpc} onChange={e => setCpc(e.target.value)} className="w-full px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
          <button type="submit" disabled={karrotLoading} className="mt-2 px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50">
            {karrotLoading ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>

      {/* Connected Accounts Summary */}
      {accounts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">연동된 계정</h2>
          <div className="space-y-3">
            {accounts.map((account: any) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-xl">
                      {account.platform === 'google' ? '🔍' : account.platform === 'meta' ? '📘' : '🟢'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{account.account_name}</p>
                    <p className="text-sm text-gray-600 capitalize">{account.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 font-medium">연동됨</span>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 네이버 API 키 입력 모달 */}
      {showNaverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-green-600 to-green-800 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">네이버 검색광고 연동</h3>
                    <p className="text-green-100 text-sm">API 키를 입력하여 계정을 연동합니다</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowNaverModal(false); setConnectError(null); }}
                  className="text-white/80 hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 모달 본문 */}
            <form onSubmit={handleNaverSubmit} className="p-6 space-y-4">
              {/* 안내 */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                <p className="font-medium mb-1">📌 API 키 발급 방법</p>
                <p>
                  <a 
                    href="https://searchad.naver.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-700 underline font-medium"
                  >
                    네이버 검색광고 센터
                  </a>
                  {' → 도구 → API 센터에서 API Key와 Secret Key를 발급받으세요.'}
                </p>
              </div>

              {/* Customer ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  고객 ID (Customer ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={naverForm.customerId}
                  onChange={(e) => setNaverForm({ ...naverForm, customerId: e.target.value })}
                  placeholder="예: 1234567"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={naverForm.apiKey}
                  onChange={(e) => setNaverForm({ ...naverForm, apiKey: e.target.value })}
                  placeholder="0100000000..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-mono text-sm"
                />
              </div>

              {/* Secret Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={naverForm.secretKey}
                    onChange={(e) => setNaverForm({ ...naverForm, secretKey: e.target.value })}
                    placeholder="AQAAAAD..."
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 계정명 (선택) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계정명 <span className="text-gray-400">(선택)</span>
                </label>
                <input
                  type="text"
                  value={naverForm.accountName}
                  onChange={(e) => setNaverForm({ ...naverForm, accountName: e.target.value })}
                  placeholder="네이버 검색광고"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                />
              </div>

              {/* 에러 메시지 */}
              {connectError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>{connectError}</p>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowNaverModal(false); setConnectError(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={naverConnectMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {naverConnectMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      연동 중...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      연동하기
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
