import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
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
import AdvancedModelTestPage from './pages/AdvancedModelTestPage';
import EmailReportPage from './pages/EmailReportPage';
import MarketingAnalysis from './pages/MarketingAnalysis';
import logo from "./assets/logo_crop.png";


// Placeholder components (to be created)
const AccountsPage = () => <div className="p-8">계정 관리 (구현 필요)</div>;

// Simple Layout Component
const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { to: '/analysis', label: 'AI 예산 분석' },
    { to: '/insights', label: '인사이트' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <img
                  src={logo}
                  alt="PLAN BE"
                  className="h-9 sm:h-12 w-auto object-contain"
                />
              </Link>
            </div>

            {/* 데스크탑 네비게이션 */}
            <div className="hidden md:flex items-center space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
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

            {/* 모바일 햄버거 버튼 */}
            <div className="flex items-center md:hidden">
              <button
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
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
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
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto py-3 sm:py-6">{children}</main>
    </div>
  );
};

// Protected Route Component
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
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
                  <DashboardPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <PrivateRoute>
                <Layout>
                  <CampaignsPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/campaigns/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <CampaignDetailPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <PrivateRoute>
                <Layout>
                  <AccountsPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/integration"
            element={
              <PrivateRoute>
                <Layout>
                  <IntegrationPage />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/insights"
            element={
              <PrivateRoute>
                <Layout>
                  <InsightsPage />
                </Layout>
              </PrivateRoute>
            }
          />

            {/* ★ [추가] AI 분석 페이지 라우트 */}
          <Route
            path="/analysis"
            element={
              <PrivateRoute>
                <Layout>
                  <MarketingAnalysis />
                </Layout>
              </PrivateRoute>
            }
          />


          <Route
            path="/dummy-data"
            element={
              <PrivateRoute>
                <Layout>
                  <DummyDataPage />
                </Layout>
              </PrivateRoute>
            }
          />

          {/* ★ [추가] 원본 데이터 관리 페이지 라우트 */}
          <Route
            path="/data-management"
            element={
              <PrivateRoute>
                <Layout>
                  <DataManagementPage />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/advanced-model-test"
            element={
              <PrivateRoute>
                <Layout>
                  <AdvancedModelTestPage />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/me"
            element={
              <PrivateRoute>
                <Layout>
                  <MyPage />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/email-report"
            element={
              <PrivateRoute>
                <Layout>
                  <EmailReportPage />
                </Layout>
              </PrivateRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
