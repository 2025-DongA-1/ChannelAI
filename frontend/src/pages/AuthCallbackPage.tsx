import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api'; // 추가: API 호출을 위한 임포트

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      console.error('소셜 로그인 오류:', error);
      alert('소셜 로그인에 실패했습니다.');
      navigate('/login');
      return;
    }

    if (token) {
      // 1. 임시로 스토어에 토큰만 저장 (인터셉터가 API 요청 시 사용하게 함)
      // 이름 등의 가짜 정보 대신, 실제 DB에서 유저 정보를 가져와야 provider(로그인 방식)가 반영됩니다.
      localStorage.setItem('token', token);
      
      authAPI.getMe()
        .then((response) => {
          if (response.data && response.data.user) {
            // 가져온 진짜 사용자 정보와 토큰을 스토어에 저장
            setAuth(response.data.user, token);
            navigate('/dashboard');
          } else {
            throw new Error('사용자 정보가 응답에 없습니다.');
          }
        })
        .catch((err) => {
          console.error('소셜 사용자 정보 조회 실패:', err);
          alert('사용자 정보를 가져오는데 실패했습니다.');
          navigate('/login');
        });
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
          <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-lg text-gray-700">로그인 중...</p>
      </div>
    </div>
  );
}
