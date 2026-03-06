import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { BarChart3, Target, Sparkles, ArrowRight } from 'lucide-react';

export default function MainPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section (메인 배너 영역) */}
      <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-8 leading-tight">
            마케팅 예산 누수, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              AI가 완벽하게 막아드립니다.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Plan BE는 네이버, 메타, 구글 등 다매체 광고 성과를 한곳에 모아 분석하고, 
            가장 효율적인 예산 재배분 전략을 제안하는 스마트 마케팅 솔루션입니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isAuthenticated ? (
              <Link to="/dashboard" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-lg hover:shadow-xl w-full sm:w-auto">
                내 대시보드로 이동
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-lg hover:shadow-xl w-full sm:w-auto">
                  무료로 시작하기
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-gray-700 bg-white border-2 border-gray-200 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition w-full sm:w-auto">
                  로그인
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section (핵심 기능 소개 영역) */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">마케팅 초보 사장님도 전문가처럼</h2>
            <p className="text-lg text-gray-600">복잡한 데이터 분석은 AI에게 맡기고, 비즈니스 성장에만 집중하세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">통합 성과 대시보드</h3>
              <p className="text-gray-600 leading-relaxed">
                여러 매체에 흩어진 광고 데이터를 한곳에서 확인하세요. 직관적인 차트와 지표로 현재 상황을 한눈에 파악할 수 있습니다.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-indigo-50 border border-indigo-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI 예산 최적화 추천</h3>
              <p className="text-gray-600 leading-relaxed">
                비효율 매체의 예산을 줄이고, 고효율 매체에 집중하세요. AI가 최적의 예산 재배분 플랜을 정확한 수치로 제안합니다.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-purple-50 border border-purple-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">크로스 미디어 인사이트</h3>
              <p className="text-gray-600 leading-relaxed">
                매체 간의 성과를 교차 분석하여 미끼 매체와 핵심 전환 매체의 역할을 명확하게 진단해 드립니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (하단 영역) */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <span className="text-2xl font-bold text-white tracking-wider">PLAN BE</span>
            <p className="mt-4 text-sm leading-relaxed max-w-sm">
              소상공인과 마케터를 위한 가장 쉽고 강력한 AI 마케팅 예산 최적화 솔루션.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">서비스</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/dashboard" className="hover:text-white transition">대시보드</Link></li>
              <li><Link to="/analysis" className="hover:text-white transition">AI 예산 분석</Link></li>
              <li><Link to="/insights" className="hover:text-white transition">인사이트 리포트</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">고객지원</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-white transition">이용약관</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition">개인정보처리방침</Link></li>
              <li><a href="mailto:support@planbe.com" className="hover:text-white transition">문의하기</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-800 text-sm text-center">
          &copy; {new Date().getFullYear()} Channel AI Team. All rights reserved.
        </div>
      </footer>
    </div>
  );
}