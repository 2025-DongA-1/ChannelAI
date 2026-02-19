import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, accountAPI, integrationAPI } from '@/lib/api';
import { Link2, CheckCircle, XCircle, RefreshCw, AlertCircle, UploadCloud, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IntegrationPage() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await integrationAPI.syncAll({ startDate, endDate, platform });
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

  const handleConnect = async (platform: string) => {
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
      description: '네이버 검색광고, 쇼핑검색 광고',
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
          <p className="font-medium mb-1">안전한 OAuth 2.0 인증 및 데이터 업로드</p>
          <p>공식 OAuth 연동 혹은 정해진 양식의 CSV 파일을 통해 데이터를 안전하게 통합할 수 있습니다.</p>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => {
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
                        <span className="text-gray-600">연동일</span>
                        <span className="font-medium text-gray-900">
                          {new Date(account.created_at).toLocaleDateString('ko-KR')}
                        </span>
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
    </div>
  );
}
