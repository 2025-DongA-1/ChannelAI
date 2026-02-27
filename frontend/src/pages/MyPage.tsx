import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../lib/api';

/**
 * 마이페이지 (내 정보) 컴포넌트
 * - 사용자 기본 정보(이름, 이메일, 역할)를 표시합니다.
 * - 소셜 로그인 연동 상태를 확인하고 관리(연결하기)할 수 있습니다.
 */
const MyPage = () => {
  // 전역 상태(authStore)에서 개별적으로 상태를 가져옵니다. (무한 루프 방지)
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  const location = useLocation();
  const navigate = useNavigate();

  // 디버깅: 렌더링 시 토큰 상태 확인
  console.log('👀 MyPage 렌더링 - Token:', token ? '있음' : '없음', 'User:', user);

  // 소셜 연동 성공 후 리다이렉트 된 경우에만 유저 정보 갱신
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    // URL에 'success' 파라미터가 있고, 토큰이 존재할 때만 실행
    if (params.get('success') && token) {
        console.log('🔄 소셜 연동 성공 감지: 유저 정보 최신화 시도');
        
        authAPI.getMe().then((response) => {
            if (response.data && response.data.user) {
                console.log('✅ 유저 정보 업데이트 완료');
                setAuth(response.data.user, token);
            }
            // URL 파라미터 제거 (깨끗한 URL로 변경)
            navigate('/me', { replace: true });
        }).catch((error) => {
            console.error('유저 정보 갱신 실패:', error);
        });
    }
  }, [location.search, token, navigate, setAuth]);

  /**
   * 소셜 로그인 연동 버튼 클릭 핸들러
   */
  const handleConnect = async (platform: string) => {
    try {
      let response;
      if (platform === 'kakao') {
        response = await authAPI.connectKakao();
      } else if (platform === 'naver') {
        response = await authAPI.connectNaver();
      } else if (platform === 'google') {
        response = await authAPI.connectGoogle();
      }

      if (response && response.data && response.data.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        alert(`${platform} 연동 URL을 가져오는데 실패했습니다.`);
      }
    } catch (error) {
      console.error(`${platform} 연동 에러:`, error);
      alert('연동 중 오류가 발생했습니다.');
    }
  };

  const platforms = [
    { id: 'google', name: 'Google', connected: user?.provider === 'google' || user?.provider === 'google,naver' || user?.provider === 'google,kakao' || user?.provider === 'all' }, // 임시 로직
    { id: 'naver', name: 'Naver', connected: user?.provider === 'naver' },
    { id: 'kakao', name: 'Kakao', connected: user?.provider === 'kakao' },
  ];

  // 현재 로그인된 계정의 제공자 확인 (화면에 표시용)
  const currentProvider = user?.provider || 'email'; 

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">내 정보</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">기본 정보</h2>
        <div className="space-y-4">
          <div className="flex border-b pb-4">
            <span className="w-32 font-medium text-gray-500">이름</span>
            <span>{user?.name || '정보 없음'}</span>
          </div>
          <div className="flex border-b pb-4">
            <span className="w-32 font-medium text-gray-500">이메일</span>
            <span>{user?.email || '정보 없음'}</span>
          </div>
          <div className="flex border-b pb-4">
            <span className="w-32 font-medium text-gray-500">역할</span>
            <span className="uppercase">{user?.role || 'USER'}</span>
          </div>
          <div className="flex border-b pb-4">
            <span className="w-32 font-medium text-gray-500">로그인 방식</span>
            <span className="uppercase">{currentProvider}</span>
          </div>
           <div className="flex border-b pb-4">
            <span className="w-32 font-medium text-gray-500">사업자 번호</span>
            <span>{user?.business_number || '등록되지 않음'}</span> 
          </div>
           <div className="flex pb-4">
            <span className="w-32 font-medium text-gray-500">요금제</span>
            <span className="uppercase">{user?.plan || 'FREE'}</span> 
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">계정 연동 관리</h2>
        <p className="text-gray-600 mb-6 text-sm">
          다른 소셜 계정을 연동하여 간편하게 로그인할 수 있습니다.
        </p>
        
        <div className="space-y-4">
          {platforms.map((platform) => (
            <div key={platform.id} className="flex items-center justify-between border p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                  ${platform.id === 'google' ? 'bg-red-100 text-red-600' : 
                    platform.id === 'naver' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-700'}`}>
                  {platform.name[0]}
                </div>
                <span className="font-medium">{platform.name}</span>
              </div>
              
              {platform.connected ? (
                <span className="text-green-600 text-sm font-medium px-3 py-1 bg-green-50 rounded-full">
                  연동됨
                </span>
              ) : (
                <button 
                  onClick={() => handleConnect(platform.id)}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition"
                >
                  연동하기
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
       <div className="mt-8 text-center">
            <button
                onClick={logout}
                className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
                로그아웃
            </button>
        </div>
    </div>
  );
};

export default MyPage;
