import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    const name = searchParams.get('name');
    const error = searchParams.get('error');

    if (error) {
      console.error('소셜 로그인 오류:', error);
      alert('소셜 로그인에 실패했습니다.');
      navigate('/login');
      return;
    }

    if (token && name) {
      // 사용자 정보 설정
      const user = {
        id: 0, // OAuth 로그인 시 임시 ID
        name: decodeURIComponent(name),
        email: '', // 백엔드에서 이메일도 전달하면 추가
      };
      
      setAuth(user, token);
      navigate('/dashboard');
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
