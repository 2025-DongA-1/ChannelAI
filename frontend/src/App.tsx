import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import IntegrationPage from './pages/IntegrationPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import InsightsPage from './pages/InsightsPage';
import AIRecommendationPage from './pages/AIRecommendationPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

// Placeholder components (to be created)
const AccountsPage = () => <div className="p-8">계정 관리 (구현 필요)</div>;

// Simple Layout Component
const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">Marketing AI Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-700 hover:text-gray-900">대시보드</a>
              <a href="/campaigns" className="text-gray-700 hover:text-gray-900">캠페인 & 예산</a>
              <a href="/ai-recommend" className="text-gray-700 hover:text-gray-900">✨ AI 추천</a>
              <a href="/integration" className="text-gray-700 hover:text-gray-900">연동</a>
              <a href="/insights" className="text-gray-700 hover:text-gray-900">인사이트</a>
              <div className="flex items-center space-x-2 ml-4 pl-4 border-l">
                <span className="text-sm text-gray-600">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6">{children}</main>
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
            path="/ai-recommend"
            element={
              <PrivateRoute>
                <Layout>
                  <AIRecommendationPage />
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

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
