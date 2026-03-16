  // ...existing code...
  // ...existing code...
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, accountAPI, integrationAPI } from '@/lib/api';
// [2026-03-11 11:04] 데이터 관리 페이지 링크용 Database 아이콘 추가
import { Link2, CheckCircle, XCircle, RefreshCw, AlertCircle, UploadCloud, FileSpreadsheet, Key, X, Eye, EyeOff, Database, Send, CheckCircle2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
// [2026-03-11 11:21] 유저/어드민 권한 분리를 위해 authStore import
import { useAuthStore } from '../store/authStore';
import { useTutorialStore } from '../store/tutorialStore';

export default function IntegrationPage() {
  const { isTutorialModeEnabled } = useTutorialStore();
  // [2026-03-11 11:21] 유저 role 확인 (role === 'user'이면 CSV 업로드, 테스트 데이터 생성 버튼 숨김)
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role !== 'user';
  // [디버그] 브라우저 콘솔(F12)에서 role 값 확인용 - 확인 후 삭제
  console.log('[IntegrationPage] user:', user, '| role:', user?.role, '| isAdmin:', isAdmin);
  // 수정 상태 관리 (반드시 함수 내부에서 선언)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // --- Tutorial State ---
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [targetRect, setTargetRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // --- Speech Bubble State ---
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleMessage, setBubbleMessage] = useState<string>('');
  const [bubbleOpacity, setBubbleOpacity] = useState(0);
  const [bubbleRect, setBubbleRect] = useState<{ top: number, left: number, isMobile: boolean } | null>(null);

  const updateBubblePos = () => {
    const mobileEl = document.getElementById('nav-menu-mobile-dashboard');
    const pcEl = document.getElementById('nav-menu-dashboard');
    
    let el = null;
    let isMobile = false;

    if (window.innerWidth < 768 && mobileEl) {
      el = mobileEl;
      isMobile = true;
    } else if (pcEl) {
      el = pcEl;
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      if (isMobile) {
        // 모바일일 경우: 하단 네비게이션이므로 위로 띄움
        setBubbleRect({ top: rect.top - 15, left: window.innerWidth / 2, isMobile });
      } else {
        // PC일 경우: 왼쪽 네비게이션이므로 오른쪽에 띄움 (요청하신 대로 메뉴 아랫쪽이나 옆쪽으로). 여기서는 메뉴 바로 우측 아래로 배치.
        setBubbleRect({ top: rect.bottom + 10, left: rect.left + 20, isMobile });
      }
    }
  };

  useEffect(() => {
    // 10초 후 말풍선 1 표시
    const timer1 = setTimeout(() => {
      setBubbleMessage('연동을 완료하셨나요?\n대시보드에서 현재 광고 성과를 체크해보세요!\n(동기화 필수)');
      updateBubblePos();
      setShowBubble(true);
      setBubbleOpacity(1);
    }, 10000);

    // 15초 표시 후 (총 25초) 페이드 아웃
    const timer2 = setTimeout(() => {
      setBubbleOpacity(0);
    }, 25000);

    // 잠시 페이드아웃 딜레이 후 말풍선 2로 변경하고 페이드 인
    const timer3 = setTimeout(() => {
      setBubbleMessage('연동에 어려움을 겪고 계신가요?\n기본적으로 광고 계정 내 API를 연동하는\n키나 앱이 필요할 수 있습니다.');
      updateBubblePos();
      setBubbleOpacity(1);
    }, 25500);

    // 말풍선 2 표시 15초 후 (총 40초) 최종 페이드 아웃
    const timer4 = setTimeout(() => {
      setBubbleOpacity(0);
    }, 40500);
    
    // 최종 언마운트
    const timer5 = setTimeout(() => {
      setShowBubble(false);
    }, 41000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, []);

  useEffect(() => {
    if (showBubble) {
      window.addEventListener('resize', updateBubblePos);
      window.addEventListener('scroll', updateBubblePos);
      return () => {
        window.removeEventListener('resize', updateBubblePos);
        window.removeEventListener('scroll', updateBubblePos);
      };
    }
  }, [showBubble]);

  const TOUR_STEPS = [
    { id: 'tour-data-management', text: '데이터 관리 페이지에서 전체 데이터를\n조회하고 광고 캠페인별 수입을 입력할 수\n있어요.' },
    { id: 'tour-platforms', text: 'Google, Meta, Naver 등의 계정을\n연동해 캠페인 데이터를 불러올 수\n있습니다. 각 플랫폼 별 광고 계정 생성이 완료되어야 연동이 가능합니다.' },
    { id: 'tour-karrot', text: '현재 당근마켓은 자동 연동을 지원하지\n않아, 성과를 직접 입력하여 관리할 수\n있습니다.' }
  ];

  useEffect(() => {
    const hasSeen = localStorage.getItem('tour_done_integration');
    if (isTutorialModeEnabled) {
      setShowTour(true);
    } else if (!hasSeen) {
      setShowTour(true);
      localStorage.setItem('tour_done_integration', 'true');
    } else {
      setShowTour(false);
    }
  }, [isTutorialModeEnabled]);

  // 튜토리얼 중 배경 스크롤 방지
  useEffect(() => {
    if (showTour) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showTour]);

  useEffect(() => {
    if (!showTour) return;
    
    const updateRect = () => {
      const currentId = TOUR_STEPS[tourStep]?.id;
      if (!currentId) return;
      const el = document.getElementById(currentId);
      if (el) {
        const rect = el.getBoundingClientRect();
        // 스크롤이 필요할 경우
        if (rect.top < 60 || rect.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: 'smooth', block: currentId === 'tour-platforms' ? 'start' : 'center' });
          setTimeout(() => {
            const newRect = el.getBoundingClientRect();
            setTargetRect({ x: newRect.left - 8, y: newRect.top - 8, w: newRect.width + 16, h: newRect.height + 16 });
          }, 400); // 스크롤 애니메이션 대기
        } else {
          setTargetRect({ x: rect.left - 8, y: rect.top - 8, w: rect.width + 16, h: rect.height + 16 });
        }
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    
    // 클라이언트 라우팅 진입 시 DOM이 아직 레이아웃 되기 전일 수 있으므로,
    // 짧은 딜레이와 넉넉한 딜레이 두 번에 걸쳐 rect 재계산
    const timer1 = setTimeout(updateRect, 100);
    const timer2 = setTimeout(updateRect, 400);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [tourStep, showTour]);

  const handleNextTour = () => {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(prev => prev + 1);
    } else {
      handleCloseTour();
    }
  };

  const handleCloseTour = () => {
    setShowTour(false);
  };
  // ----------------------

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
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ OAuth 콜백 후 URL 파라미터 감지 → 계정 목록 자동 갱신
  useEffect(() => {
    const success = searchParams.get('success');
    const errorMsg = searchParams.get('error');
    const platform = searchParams.get('platform');

    if (success === 'true') {
      // 계정 목록 및 캠페인 쿼리 갱신
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      // URL에서 파라미터 제거 (뒤로가기 시 중복 처리 방지)
      setSearchParams({}, { replace: true });
      if (platform) {
        alert(`✅ ${platform.charAt(0).toUpperCase() + platform.slice(1)} 계정 연동이 완료되었습니다!`);
      }
    } else if (errorMsg) {
      setSearchParams({}, { replace: true });
      alert(`❌ 연동 실패: ${decodeURIComponent(errorMsg)}`);
    }
  }, [searchParams, queryClient, setSearchParams]);
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
    <>
    {/* --- Animated Speech Bubble Portal --- */}
    {showBubble && bubbleRect && createPortal(
      <div 
        className={`fixed z-[100] transition-opacity duration-500 ease-in-out pointer-events-none ${bubbleOpacity ? 'opacity-100' : 'opacity-0'}`}
        style={{
          top: bubbleRect.isMobile ? bubbleRect.top : bubbleRect.top,
          left: bubbleRect.isMobile ? bubbleRect.left : bubbleRect.left,
          transform: bubbleRect.isMobile ? 'translate(-50%, -100%)' : 'translate(0, 0)',
        }}
      >
        <div className="relative animate-bounce" style={{ animationDuration: '0.8s' }}>
          <div className="bg-indigo-600 text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-2xl shadow-xl max-w-xs whitespace-pre-wrap leading-relaxed border border-indigo-500">
            {bubbleMessage}
          </div>
          {/* 꼬리 (삼각형) */}
          <div 
            className="absolute w-3 h-3 bg-indigo-600 border-b border-r border-indigo-500 transform rotate-45"
            style={
              bubbleRect.isMobile 
                ? { bottom: '-6px', left: '50%', marginLeft: '-6px' }  // 아래쪽 꼬리
                : { top: '-6px', left: '20px' }                        // 위쪽 꼬리
            }
          />
        </div>
      </div>,
      document.body
    )}

    <div className="space-y-3 sm:space-y-6 p-2 sm:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-3xl font-bold text-gray-900">광고 플랫폼 연동</h1>
          <p className="text-xs sm:text-base text-gray-600 mt-0.5 sm:mt-1">
            Google, Meta, Naver 광고 계정을 연동하여 통합 관리하세요
          </p>
        </div>
        <div id="tour-data-management" className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* [2026-03-11 11:26] 데이터 관리 버튼 - role에 관계없이 항상 표시 */}
          <Link 
            to="/data-management" 
            className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200 font-medium hover:bg-blue-100 transition w-full sm:w-auto text-xs sm:text-base"
          >
            <Database className="w-4 h-4 mr-2" />
            데이터 관리
          </Link>
          {/* [2026-03-11 11:21] role === 'user'이면 CSV 업로드, 테스트 데이터 생성 버튼 숨김 */}
          {isAdmin && (
            <>
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
                className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-md w-full sm:w-auto text-xs sm:text-base disabled:opacity-50"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                {isUploading ? '업로드 중...' : 'CSV 업로드'}
              </button>
              <Link 
                to="/dummy-data" 
                className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200 font-medium hover:bg-indigo-100 transition w-full sm:w-auto text-xs sm:text-base"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                테스트 데이터 생성
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-4 flex items-start">
        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 mr-2 sm:mr-3 flex-shrink-0" />
        <div className="text-xs sm:text-sm text-blue-800">
          <p className="font-medium mb-0.5 sm:mb-1">다양한 인증 방식 지원</p>
          <p>네이버는 API Key 입력, Google/Meta는 OAuth 2.0, CSV 업로드도 지원합니다.</p>
        </div>
      </div>

      {/* Platform Cards */}
      <div id="tour-platforms" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
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
              <div className={`${platform.bgColor} p-3 sm:p-6 border-b ${platform.borderColor}`}>
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className={`text-2xl sm:text-4xl w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center bg-gradient-to-br ${platform.color} rounded-xl`}>
                    <span className="text-white">{platform.icon}</span>
                  </div>
                  {isConnected ? (
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                  )}
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900">{platform.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">{platform.description}</p>
              </div>

              {/* Body */}
              <div className="p-3 sm:p-6 space-y-2 sm:space-y-4">
                {isConnected ? (
                  <>
                    {/* Account Info */}
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">계정 ID</span>
                        <span className="font-medium text-gray-900">{account.account_id}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">계정명</span>
                        <span className="font-medium text-gray-900">{account.account_name}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">캠페인 수</span>
                        <span className="font-medium text-gray-900">{account.campaign_count || 0}개</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">마지막 동기화</span>
                        <span className="font-medium text-gray-900">
                          {account.last_sync_at
                            ? new Date(account.last_sync_at).toLocaleString('ko-KR')
                            : '동기화 안됨'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:gap-2">
                      <button
                        onClick={() => handleSync(platform.id)}
                        disabled={isSyncing}
                        className="flex items-center justify-center px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="px-2 sm:px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-xs sm:text-base"
                      >
                        해제
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Not Connected */}
                    <div className="text-center py-2 sm:py-4">
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-4">
                        {platform.name} 계정을 연동하여<br className="sm:hidden" />
                        캠페인과 데이터를 가져오세요
                      </p>
                      <button
                        onClick={() => handleConnect(platform.id)}
                        className={`w-full flex items-center justify-center px-2 sm:px-4 py-2 sm:py-3 bg-gradient-to-r ${platform.color} text-white rounded-lg hover:shadow-lg transition font-medium text-xs sm:text-base`}
                      >
                        <Link2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
      <div id="tour-karrot" className="bg-orange-50 border border-orange-200 rounded-xl p-3 sm:p-6 mt-6 sm:mt-8">
        <h2 className="text-base sm:text-2xl font-bold text-orange-700 mb-1 sm:mb-2 flex items-center">
          🥕 당근마켓 광고 데이터 직접 입력
        </h2>
        <p className="text-xs sm:text-sm text-orange-900 mb-2 sm:mb-4">
          당근마켓 광고센터에서 확인한 성과 데이터를 아래 입력란에 직접 입력해 주세요.<br className="sm:hidden" />
          전문가 모드/키워드 광고는 엑셀 보고서를 첨부해 주세요.<br className="sm:hidden" />
          모든 항목을 빠짐없이 입력해야 정확한 분석이 가능합니다.
        </p>
        <form className="space-y-2 sm:space-y-4 max-w-xl" onSubmit={async e => {
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

    {/* 튜토리얼 오버레이 */}
    {showTour && TOUR_STEPS[tourStep] && (
      <div className="fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center">
        {/* SVG Mask for Hole-Punch Effect */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="tour-hole">
              <rect width="100%" height="100%" fill="white" />
              <rect 
                x={targetRect.x} 
                y={targetRect.y} 
                width={targetRect.w} 
                height={targetRect.h} 
                rx="12" 
                fill="black" 
                className="transition-all duration-500 ease-in-out" 
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-hole)" className="transition-all duration-500" />
        </svg>

        {/* 하이라이트된 영역 툴팁 */}
        <div 
          className="absolute z-[101] transition-all duration-500 ease-in-out flex flex-col"
          style={{
            ...(() => {
              const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
              const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
              const boxWidth = Math.min(300, screenWidth - 32);
              
              // 화면 밖으로 나가지 않도록 left 위치 보정
              let leftPos = targetRect.x + targetRect.w / 2 - boxWidth / 2;
              leftPos = Math.max(16, Math.min(leftPos, screenWidth - boxWidth - 16));

              if (tourStep === 1) {
                // 2번째 스텝 (플랫폼): 높이가 길기 때문에, 툴팁을 하이라이트된 영역 안쪽 상단에 배치
                return { top: Math.max(16, targetRect.y + 24), left: leftPos, width: boxWidth };
              } else if (tourStep === 2) {
                // 3번째 스텝 (당근마켓): 데스크톱은 하이라이트 영역 안쪽 상단 좌측, 모바일은 안쪽 상단 중앙
                if (!isMobile) {
                  return { top: targetRect.y + 24, left: Math.max(16, targetRect.x + 24), width: boxWidth };
                }
                return { top: Math.max(16, targetRect.y + 24), left: leftPos, width: boxWidth };
              } else {
                // 기본 (1번째 스텝 등): 스포트라이트 하단
                return { top: targetRect.y + targetRect.h + 16, left: leftPos, width: boxWidth };
              }
            })()
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-5 relative animate-in fade-in zoom-in duration-300">
            {/* 동적 위치 꼬리표 */}
            <div className={`absolute w-4 h-4 bg-white rotate-45 transition-all duration-300 ${
              tourStep === 1 || tourStep === 2
                ? "hidden" // 영역 안쪽에 배치하므로 꼬리표 숨김
                : "-top-2 left-1/2 -translate-x-1/2" // 기본(하단 배치): 위로 향하는 꼬리표
            }`} />
            <div className="relative z-10">
              <p className="text-[15px] leading-relaxed text-gray-800 font-medium whitespace-pre-wrap">
                {TOUR_STEPS[tourStep].text}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === tourStep ? 'w-4 bg-blue-600' : 'w-2 bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <button 
                  onClick={handleNextTour}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-1 shadow-md shadow-blue-200"
                >
                  {tourStep === TOUR_STEPS.length - 1 ? (
                    <>시작하기 <CheckCircle2 className="w-4 h-4" /></>
                  ) : (
                    <>다음 챕터</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 생략/바로 사용하기 버튼 */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[102] w-full px-4 flex justify-center">
          <button 
            onClick={handleCloseTour}
            className="group flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-bold text-sm sm:text-lg shadow-xl transition-all hover:scale-105 active:scale-95 w-full max-w-[280px] sm:max-w-none"
          >
            바로 사용하기 (건너뛰기)
            <Send className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    )}
    </>
  );
}
