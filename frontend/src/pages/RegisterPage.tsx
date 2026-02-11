import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailCheck, setEmailCheck] = useState<{
    checked: boolean;
    available: boolean;
    message: string;
  } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // 이메일이 변경되면 중복체크 초기화
    if (e.target.name === 'email') {
      setEmailCheck(null);
    }
  };

  const handleCheckEmail = async () => {
    if (!formData.email) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setCheckingEmail(true);
    setError('');

    try {
      const response = await authAPI.checkEmail(formData.email);
      setEmailCheck({
        checked: true,
        available: response.data.available,
        message: response.data.message,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || '이메일 확인 중 오류가 발생했습니다.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 이메일 중복체크 확인
    if (!emailCheck?.checked || !emailCheck?.available) {
      setError('이메일 중복확인을 해주세요.');
      setLoading(false);
      return;
    }

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    try {
      await authAPI.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        company: formData.company || '',
      });
      
      // 회원가입 성공 후 로그인 페이지로 이동
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Logo & Title */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">회원가입</h2>
            <p className="mt-2 text-gray-600">멀티채널 마케팅 통합 플랫폼</p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                이름 *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="홍길동"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일 *
              </label>
              <div className="flex gap-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="example@company.com"
                  required
                />
                <button
                  type="button"
                  onClick={handleCheckEmail}
                  disabled={checkingEmail || !formData.email}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap transition"
                >
                  {checkingEmail ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    '중복확인'
                  )}
                </button>
              </div>
              {emailCheck && (
                <div className={`mt-2 flex items-center gap-1 text-sm ${
                  emailCheck.available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {emailCheck.available ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>{emailCheck.message}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                회사명
              </label>
              <input
                id="company"
                name="company"
                type="text"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="(주)마케팅컴퍼니"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">최소 6자 이상</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 확인 *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  가입 중...
                </span>
              ) : (
                '회원가입'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              로그인
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
