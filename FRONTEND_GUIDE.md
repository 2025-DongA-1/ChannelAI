# 프론트엔드 구현 가이드

## 📋 현재 상태

### ✅ 완료된 항목
1. **프로젝트 초기화**
   - React + TypeScript + Vite 설정 완료
   - Tailwind CSS 설정 완료
   - 필수 라이브러리 설치 완료
     - react-router-dom (라우팅)
     - axios (API 통신)
     - @tanstack/react-query (데이터 페칭)
     - zustand (상태관리)
     - recharts (차트)
     - lucide-react (아이콘)

2. **핵심 설정 파일**
   - `/src/lib/api.ts` - API 클라이언트 및 모든 API 함수
   - `/src/store/authStore.ts` - 인증 상태 관리
   - `/src/lib/utils.ts` - 유틸리티 함수 (포맷팅, 계산 등)
   - `vite.config.ts` - 프록시 설정 (포트 3001)
   - `tailwind.config.js` - 디자인 시스템 설정

## 📂 구현해야 할 페이지 구조

```
src/
├── components/
│   ├── Layout.tsx              # 메인 레이아웃 (사이드바, 헤더)
│   ├── Sidebar.tsx             # 네비게이션 사이드바
│   ├── Header.tsx              # 상단 헤더 (유저 정보, 알림)
│   ├── Card.tsx                # 재사용 카드 컴포넌트
│   ├── Button.tsx              # 버튼 컴포넌트
│   ├── Input.tsx               # 인풋 컴포넌트
│   └── MetricCard.tsx          # 메트릭 표시 카드
│
├── pages/
│   ├── LoginPage.tsx           # 로그인 페이지
│   ├── RegisterPage.tsx        # 회원가입 페이지
│   ├── DashboardPage.tsx       # 통합 대시보드
│   ├── CampaignsPage.tsx       # 캠페인 목록
│   ├── CampaignDetailPage.tsx  # 캠페인 상세
│   ├── AccountsPage.tsx        # 계정 관리
│   ├── IntegrationPage.tsx     # API 연동
│   ├── BudgetPage.tsx          # 예산 관리
│   └── InsightsPage.tsx        # 인사이트
│
├── lib/
│   ├── api.ts                  # ✅ API 클라이언트
│   └── utils.ts                # ✅ 유틸리티
│
└── store/
    └── authStore.ts            # ✅ 인증 스토어
```

## 🎨 구현 우선순위

### 1단계: 인증 시스템 (필수)
**파일: LoginPage.tsx, RegisterPage.tsx**

```tsx
// LoginPage.tsx 예시
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login({ email, password });
      setAuth(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">로그인</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 2단계: 레이아웃 시스템
**파일: Layout.tsx, Sidebar.tsx, Header.tsx**

```tsx
// Layout.tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

```tsx
// Sidebar.tsx
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, Wallet, Link as LinkIcon, Lightbulb } from 'lucide-react';

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '캠페인', href: '/campaigns', icon: Target },
  { name: '예산', href: '/budget', icon: Wallet },
  { name: 'API 연동', href: '/integration', icon: LinkIcon },
  { name: '인사이트', href: '/insights', icon: Lightbulb },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-white border-r">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-600">Marketing AI</h1>
      </div>
      <nav className="px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

### 3단계: 대시보드 페이지
**파일: DashboardPage.tsx**

```tsx
// DashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '@/lib/api';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { TrendingUp, MousePointerClick, DollarSign, Target } from 'lucide-react';

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardAPI.getSummary(),
  });

  const { data: performance } = useQuery({
    queryKey: ['channel-performance'],
    queryFn: () => dashboardAPI.getChannelPerformance(),
  });

  const metrics = summary?.data?.metrics;
  const budget = summary?.data?.budget;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">통합 성과 대시보드</h1>

      {/* 주요 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="총 노출수"
          value={formatNumber(metrics?.impressions || 0)}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="총 클릭수"
          value={formatNumber(metrics?.clicks || 0)}
          icon={MousePointerClick}
          color="green"
        />
        <MetricCard
          title="총 광고비"
          value={formatCurrency(metrics?.cost || 0)}
          icon={DollarSign}
          color="yellow"
        />
        <MetricCard
          title="전환수"
          value={formatNumber(metrics?.conversions || 0)}
          icon={Target}
          color="purple"
        />
      </div>

      {/* 채널별 성과 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">채널별 성과</h2>
        <div className="space-y-4">
          {performance?.data?.performance?.map((channel: any) => (
            <div key={channel.platform} className="border-b pb-4 last:border-0">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium capitalize">{channel.platform}</span>
                <span className="text-sm text-gray-500">
                  {channel.campaigns}개 캠페인
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">노출</p>
                  <p className="font-medium">{formatNumber(channel.metrics.impressions)}</p>
                </div>
                <div>
                  <p className="text-gray-500">클릭</p>
                  <p className="font-medium">{formatNumber(channel.metrics.clicks)}</p>
                </div>
                <div>
                  <p className="text-gray-500">CTR</p>
                  <p className="font-medium">{formatPercent(channel.metrics.ctr)}</p>
                </div>
                <div>
                  <p className="text-gray-500">ROAS</p>
                  <p className="font-medium">{channel.metrics.roas.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 예산 현황 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">예산 현황</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>총 예산</span>
            <span className="font-bold">{formatCurrency(budget?.total || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>사용 예산</span>
            <span className="font-bold">{formatCurrency(budget?.spent || 0)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>잔여 예산</span>
            <span className="font-bold">{formatCurrency(budget?.remaining || 0)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${budget?.utilizationRate || 0}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 text-right">
            사용률: {formatPercent(budget?.utilizationRate || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

// MetricCard 컴포넌트
function MetricCard({ title, value, icon: Icon, color }: any) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
```

### 4단계: 캠페인 관리
**파일: CampaignsPage.tsx**

```tsx
// CampaignsPage.tsx
import { useQuery } from '@tanstack/react-query';
import { campaignAPI } from '@/lib/api';
import { Link } from 'react-router-dom';
import { formatCurrency, getStatusColor, getPlatformColor } from '@/lib/utils';
import { Plus } from 'lucide-react';

export default function CampaignsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignAPI.getCampaigns(),
  });

  const campaigns = data?.data?.campaigns || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">캠페인 관리</h1>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5 mr-2" />
          새 캠페인
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                캠페인명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                플랫폼
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                일 예산
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                총 예산
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaigns.map((campaign: any) => (
              <tr key={campaign.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {campaign.campaign_name}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white ${getPlatformColor(campaign.platform)}`}>
                    {campaign.platform}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {formatCurrency(campaign.daily_budget)}
                </td>
                <td className="px-6 py-4">
                  {formatCurrency(campaign.total_budget)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && (
          <div className="p-8 text-center text-gray-500">
            로딩 중...
          </div>
        )}

        {!isLoading && campaigns.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            캠페인이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
```

## 🚀 빠른 시작 가이드

### 1. 개발 서버 실행
```bash
cd "C:\Users\smhrd\Desktop\channel AI\frontend"
npm run dev
```
→ http://localhost:3001 에서 프론트엔드 접속

### 2. 백엔드 서버도 실행
```bash
cd "C:\Users\smhrd\Desktop\channel AI\backend"
npx ts-node src/app.ts
```
→ http://localhost:3000 에서 API 서버 실행

### 3. 테스트
1. 프론트엔드에서 회원가입
2. 로그인
3. 대시보드 확인
4. 캠페인 목록 확인

## 📝 다음 구현 단계

1. **IntegrationPage.tsx** - Google/Meta/Naver 계정 연동 UI
2. **BudgetPage.tsx** - 예산 관리 및 최적화 제안
3. **InsightsPage.tsx** - AI 인사이트 및 리포트
4. **CampaignDetailPage.tsx** - 캠페인 상세 및 차트
5. **차트 컴포넌트** - Recharts로 성과 시각화

## 💡 개발 팁

1. **API 호출**: `/src/lib/api.ts`에 모든 API 함수가 정의되어 있음
2. **상태 관리**: React Query로 서버 상태, Zustand로 클라이언트 상태
3. **스타일링**: Tailwind CSS 유틸리티 클래스 사용
4. **타입**: TypeScript로 타입 안정성 확보
5. **아이콘**: lucide-react 라이브러리 사용

## ⚠️ 주의사항

- 백엔드 API 서버가 실행 중이어야 함
- CORS 설정은 백엔드에서 이미 처리됨
- JWT 토큰은 LocalStorage에 자동 저장
- 토큰 만료 시 자동으로 로그인 페이지로 리다이렉트
