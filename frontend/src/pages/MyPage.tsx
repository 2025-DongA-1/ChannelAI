import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../lib/api';

const MyPage = () => {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  const location = useLocation();
  const navigate = useNavigate();

  // ── 프로필 폼 상태 ──
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company_name: (user as any)?.company_name || '',
    business_number: user?.business_number || '',
    phone_number: (user as any)?.phone_number || '',
  });
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── 비밀번호 폼 상태 ──
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwEditing, setPwEditing] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 소셜 로그인 성공 후 정보 갱신
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success') && token) {
      authAPI.getMe().then((response) => {
        if (response.data && response.data.user) {
          setAuth(response.data.user, token);
        }
        navigate('/me', { replace: true });
      }).catch(console.error);
    }
  }, [location.search, token, navigate, setAuth]);

  // user 변경 시 폼 초기화
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        company_name: (user as any).company_name || '',
        business_number: user.business_number || '',
        phone_number: (user as any).phone_number || '',
      });
    }
  }, [user]);

  // ── 프로필 저장 ──
  const handleProfileSave = async () => {
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await authAPI.updateProfile(profileForm);
      // 전역 상태 업데이트
      if (res.data.user && token) {
        setAuth({ ...user, ...res.data.user }, token);
      }
      setProfileEditing(false);
      setProfileMsg({ type: 'success', text: '프로필이 저장되었습니다.' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || '저장 중 오류가 발생했습니다.';
      setProfileMsg({ type: 'error', text: msg });
    } finally {
      setProfileLoading(false);
    }
  };

  // ── 비밀번호 변경 ──
  const handlePasswordChange = async () => {
    setPwMsg(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: '새 비밀번호는 6자 이상이어야 합니다.' });
      return;
    }
    setPwLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwEditing(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwMsg({ type: 'success', text: '비밀번호가 변경되었습니다.' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || '비밀번호 변경 중 오류가 발생했습니다.';
      setPwMsg({ type: 'error', text: msg });
    } finally {
      setPwLoading(false);
    }
  };

  // 소셜 연동
  const handleConnect = async (platform: string) => {
    try {
      let response;
      if (platform === 'kakao') response = await authAPI.connectKakao();
      else if (platform === 'naver') response = await authAPI.connectNaver();
      else if (platform === 'google') response = await authAPI.connectGoogle();
      if (response?.data?.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      alert('연동 중 오류가 발생했습니다.');
    }
  };

  const platforms = [
    { id: 'google', name: 'Google', connected: user?.provider === 'google' },
    { id: 'naver', name: 'Naver', connected: user?.provider === 'naver' },
    { id: 'kakao', name: 'Kakao', connected: user?.provider === 'kakao' },
  ];

  const isSocialAccount = user?.provider && user.provider !== 'email' && user.provider !== 'local';

  const inputClass = "flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
  const labelClass = "w-32 font-medium text-gray-500 text-sm flex-shrink-0";
  const currentPlan = (user as { plan?: string | null } | null)?.plan === 'PRO' ? 'PRO' : 'FREE';
  const isFreePlan = currentPlan === 'FREE';


  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">내 정보</h1>

      {/* ── 기본 정보 ── */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">기본 정보</h2>
          {!profileEditing ? (
            <button
              onClick={() => { setProfileEditing(true); setProfileMsg(null); }}
              className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 transition"
            >
              수정
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setProfileEditing(false); setProfileMsg(null); }}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={handleProfileSave}
                disabled={profileLoading}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                {profileLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>

        {profileMsg && (
          <div className={`mb-4 px-4 py-2 rounded text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {profileMsg.text}
          </div>
        )}

        <div className="space-y-4">
          {/* 이름 */}
          <div className="flex items-center border-b pb-4 gap-4">
            <span className={labelClass}>이름</span>
            {profileEditing ? (
              <input className={inputClass} value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} placeholder="이름" />
            ) : (
              <span className="text-sm">{user?.name || '정보 없음'}</span>
            )}
          </div>

          {/* 이메일 */}
          <div className="flex items-center border-b pb-4 gap-4">
            <span className={labelClass}>이메일</span>
            {profileEditing && !isSocialAccount ? (
              <input className={inputClass} type="email" value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="이메일" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{user?.email || '정보 없음'}</span>
                {isSocialAccount && profileEditing && (
                  <span className="text-xs text-gray-400">(소셜 계정 이메일은 변경 불가)</span>
                )}
              </div>
            )}
          </div>

          {/* 회사명 */}
          <div className="flex items-center border-b pb-4 gap-4">
            <span className={labelClass}>회사명</span>
            {profileEditing ? (
              <input className={inputClass} value={profileForm.company_name}
                onChange={e => setProfileForm(f => ({ ...f, company_name: e.target.value }))} placeholder="회사명" />
            ) : (
              <span className="text-sm">{(user as any)?.company_name || '등록되지 않음'}</span>
            )}
          </div>

          {/* 사업자번호 */}
          <div className="flex items-center border-b pb-4 gap-4">
            <span className={labelClass}>사업자 번호</span>
            {profileEditing ? (
              <input className={inputClass} value={profileForm.business_number}
                onChange={e => setProfileForm(f => ({ ...f, business_number: e.target.value }))} placeholder="000-00-00000" />
            ) : (
              <span className="text-sm">{user?.business_number || '등록되지 않음'}</span>
            )}
          </div>

          {/* 전화번호 */}
          <div className="flex items-center border-b pb-4 gap-4">
            <span className={labelClass}>전화번호</span>
            {profileEditing ? (
              <input className={inputClass} value={profileForm.phone_number}
                onChange={e => setProfileForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="010-0000-0000" />
            ) : (
              <span className="text-sm">{(user as any)?.phone_number || '등록되지 않음'}</span>
            )}
          </div>

          {/* 로그인 방식 / 요금제 (읽기 전용) */}
          <div className="flex items-center border-b pb-4 gap-4">
            <span className={labelClass}>로그인 방식</span>
            <span className="text-sm uppercase">{user?.provider || 'email'}</span>
          </div>
        </div>
      </div>

          {/* ── 비밀번호 변경 (이메일 계정만) ── */}
      {!isSocialAccount && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">비밀번호 변경</h2>
            {!pwEditing ? (
              <button
                onClick={() => { setPwEditing(true); setPwMsg(null); }}
                className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 transition"
              >
                변경
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setPwEditing(false); setPwMsg(null); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                  className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition"
                >
                  취소
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={pwLoading}
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {pwLoading ? '변경 중...' : '저장'}
                </button>
              </div>
            )}
          </div>

          {pwMsg && (
            <div className={`mb-4 px-4 py-2 rounded text-sm ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {pwMsg.text}
            </div>
          )}

          {pwEditing && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={labelClass}>현재 비밀번호</span>
                <input className={inputClass} type="password" value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="현재 비밀번호" />
              </div>
              <div className="flex items-center gap-4">
                <span className={labelClass}>새 비밀번호</span>
                <input className={inputClass} type="password" value={pwForm.newPassword}
                  onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="6자 이상" />
              </div>
              <div className="flex items-center gap-4">
                <span className={labelClass}>비밀번호 확인</span>
                <input className={inputClass} type="password" value={pwForm.confirmPassword}
                  onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="비밀번호 재입력" />
              </div>
            </div>
          )}
          {!pwEditing && <p className="text-sm text-gray-400">비밀번호를 주기적으로 변경하세요.</p>}
        </div>
      )}


          {/* ── 요금제 및 결제 유도 전용 카드 ── */}
        <div className={`shadow rounded-lg p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isFreePlan 
              ? 'bg-white border-2 border-blue-100' 
              : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100'
          }`}>
            <div className="mb-4 sm:mb-0 flex-1">
              <h2 className="text-xl font-bold mb-1 text-gray-800">
                현재 요금제 : <span className={isFreePlan ? "text-gray-500" : "text-blue-900"}>{currentPlan}</span>
              </h2>
              <p className={`text-sm ${isFreePlan ? 'text-gray-500' : 'text-blue-700'}`}>
                {isFreePlan 
                  ? '실시간 예산 조언을 무제한으로 받고 싶다면, PRO를 시작해보세요.' 
                  : 'PRO 요금제의 모든 프리미엄 혜택을 이용 중입니다.'}
              </p>
            </div>
            
            {isFreePlan ? (
              <button
                onClick={() => navigate('/payment')}
                className="shrink-0 whitespace-nowrap px-6 py-2.5 ml-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg border-none outline-none transition-all duration-200 transform hover:-translate-y-0.5"
              >
                PRO 업그레이드
              </button>
            ) : (
              <button
                onClick={() => navigate('/subscription')}
                className="shrink-0 whitespace-nowrap px-6 py-2.5 ml-6 bg-white hover:bg-gray-50 text-blue-700 font-bold rounded-lg shadow-md hover:shadow-lg border border-blue-300 outline-none transition-all duration-200 transform hover:-translate-y-0.5"
              >
                구독 관리
              </button>
            )}
          </div>    

      
      {/* ── 소셜 연동 ── */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">소셜 계정 연동</h2>
        <p className="text-gray-500 text-sm mb-4">다른 소셜 계정을 연동하여 간편하게 로그인할 수 있습니다.</p>
        <div className="space-y-3">
          {platforms.map((platform) => (
            <div key={platform.id} className="flex items-center justify-between border p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                  ${platform.id === 'google' ? 'bg-red-100 text-red-600' :
                    platform.id === 'naver' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-700'}`}>
                  {platform.name[0]}
                </div>
                <span className="font-medium text-sm">{platform.name}</span>
              </div>
              {platform.connected ? (
                <span className="text-green-600 text-xs font-medium px-3 py-1 bg-green-50 rounded-full">연동됨</span>
              ) : (
                <button onClick={() => handleConnect(platform.id)}
                  className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 transition">
                  연동하기
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 로그아웃 ── */}
      <div className="text-center">
        <button onClick={logout}
          className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
          로그아웃
        </button>
      </div>
    </div>
  );
};

export default MyPage;
