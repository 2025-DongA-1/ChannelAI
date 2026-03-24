import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { authAPI } from './lib/api';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import IntegrationPage from './pages/IntegrationPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import InsightsPage from './pages/InsightsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import DummyDataPage from './pages/DummyDataPage';
import DataManagementPage from './pages/DataManagementPage';
import MyPage from './pages/MyPage';
import SubscriptionPage from './pages/SubscriptionPage';
import PaymentPage from './pages/PaymentPage';
import AdvancedModelTestPage from './pages/AdvancedModelTestPage';
// [2026-03-05 16:15] 수정 이유: 새로 생성한 OpenAI 모델 전용 테스트 페이지 라우트 등록
import OpenaiModelTestPage from './pages/OpenaiModelTestPage';
import EmailReportPage from './pages/EmailReportPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import MarketingAnalysis from './pages/MarketingAnalysis';
import CreativeAgentPage from './pages/CreativeAgentPage';
import logo from "./assets/logo_crop.png";
import MainPage from './pages/MainPage';
import FloatingTutorialButton from './components/FloatingTutorialButton';

// Placeholder components (to be created)
const AccountsPage = () => <div className="p-8">계정 관리 (구현 필요)</div>;

// Simple Layout Component
const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setMobileMenuOpen(true);
    const handleClose = () => setMobileMenuOpen(false);
    window.addEventListener('open-mobile-menu', handleOpen);
    window.addEventListener('close-mobile-menu', handleClose);
    return () => {
      window.removeEventListener('open-mobile-menu', handleOpen);
      window.removeEventListener('close-mobile-menu', handleClose);
    };
  }, []);

  useEffect(() => {
    // Sync mobile menu state to body for other components to check
    if (mobileMenuOpen) {
      document.body.setAttribute('data-mobile-menu-open', 'true');
    } else {
      document.body.removeAttribute('data-mobile-menu-open');
    }
  }, [mobileMenuOpen]);

  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/login');
    }
  };

  const navLinks = [
    { to: '/dashboard', label: '대시보드' },
    { to: '/campaigns', label: '캠페인 & 예산' },
    { to: '/integration', label: '연동' },
    { to: '/creative', label: 'AI 소재' },
    //{ to: '/analysis', label: 'AI 예산 분석' },
    { to: '/insights', label: '인사이트' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center">
              {/* 💡 [수정됨] 로고 클릭 시 무조건 메인 화면('/')으로 이동하도록 수정했습니다! */}
              <Link to="/" className="flex items-center">
                <img
                  src={logo}
                  alt="PLAN BE"
                  className="h-9 sm:h-12 w-auto object-contain"
                />
              </Link>
            </div>

            {/* 데스크탑 네비게이션 */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    id={`nav-menu-${link.to.replace('/', '')}`}
                    className={`text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? 'text-blue-600'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex items-center space-x-2 ml-4 pl-4 border-l">
                  <Link to="/me" className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer font-medium">
                    {user?.name || user?.email?.split('@')[0] || '사용자'}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              // 비로그인 사용자를 위한 데스크탑 네비게이션
              <div className="hidden md:flex items-center space-x-4">
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                  로그인
                </Link>
                <Link to="/register" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  무료로 시작하기
                </Link>
              </div>
            )}

            {/* 모바일 햄버거 버튼 */}
            <div className="flex items-center md:hidden">
              <button
                id="mobile-hamburger-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                aria-label="메뉴 열기"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 모바일 드롭다운 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
            {isAuthenticated ? (
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    id={`nav-menu-mobile-${link.to.replace('/', '')}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <Link
                    to="/me"
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    👤 {user?.name || user?.email?.split('@')[0] || '사용자'}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              // 비로그인 사용자를 위한 모바일 드롭다운 메뉴
              <div className="px-4 py-4 space-y-3">
                <Link to="/login" className="block w-full text-center px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  로그인
                </Link>
                <Link to="/register" className="block w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  무료로 시작하기
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
      <main className="flex-grow w-full">{children}</main>
      <FloatingTutorialButton />
    </div>
  );
};

// Protected Route Component
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Admin Only Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 앱 시작 시 user 정보(plan 등)를 서버에서 최신화하는 컴포넌트
const UserRefresher = () => {
  const { isAuthenticated, token, user, setAuth } = useAuthStore();
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    authAPI.getMe().then((res) => {
      if (res.data?.user) {
        setAuth({ ...user, ...res.data.user } as Parameters<typeof setAuth>[0], token);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UserRefresher />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout><MainPage /></Layout>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <DashboardPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <CampaignsPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/campaigns/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <CampaignDetailPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <AccountsPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/integration"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <IntegrationPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/creative"
            element={
              <PrivateRoute>
                <Layout>
                  <CreativeAgentPage />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/insights"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <InsightsPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/analysis"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <MarketingAnalysis />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/dummy-data"
            element={
              <AdminRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <DummyDataPage />
                  </div>
                </Layout>
              </AdminRoute>
            }
          />

          <Route
            path="/data-management"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <DataManagementPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/advanced-model-test"
            element={
              <AdminRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <AdvancedModelTestPage />
                  </div>
                </Layout>
              </AdminRoute>
            }
          />

          <Route
            path="/openai-model-test"
            element={
              <AdminRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <OpenaiModelTestPage />
                  </div>
                </Layout>
              </AdminRoute>
            }
          />



          <Route
            path="/me"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <MyPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/subscription"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <SubscriptionPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/payment"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <PaymentPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/email-report"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <EmailReportPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/monthly-report"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto py-3 sm:py-6 px-4 sm:px-6 lg:px-8">
                    <MonthlyReportPage />
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;