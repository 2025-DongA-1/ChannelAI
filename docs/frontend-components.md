# 프론트엔드 컴포넌트 가이드

## 기술 스택
- React 18 + TypeScript
- Redux Toolkit (상태관리)
- Material-UI (UI 컴포넌트)
- Recharts (차트)
- React Router v6 (라우팅)
- Axios (HTTP 클라이언트)

## 프로젝트 구조
```
frontend/src/
├── components/           # 재사용 가능한 컴포넌트
│   ├── common/          # 공통 컴포넌트
│   ├── dashboard/       # 대시보드 컴포넌트
│   ├── charts/          # 차트 컴포넌트
│   └── reports/         # 리포트 컴포넌트
├── pages/               # 페이지 컴포넌트
├── services/            # API 서비스
├── store/               # Redux 스토어
├── hooks/               # 커스텀 훅
├── types/               # TypeScript 타입
├── utils/               # 유틸리티 함수
└── styles/              # 전역 스타일
```

## 주요 컴포넌트

### 1. 대시보드 (Dashboard)

#### DashboardOverview.tsx
```typescript
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { fetchDashboardData } from '../../store/slices/dashboardSlice';
import MetricCard from '../common/MetricCard';
import TrendChart from '../charts/TrendChart';
import ChannelBreakdownChart from '../charts/ChannelBreakdownChart';
import TopCampaignsTable from '../dashboard/TopCampaignsTable';

interface DashboardOverviewProps {
  dateFrom: string;
  dateTo: string;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ dateFrom, dateTo }) => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state: RootState) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardData({ dateFrom, dateTo }));
  }, [dispatch, dateFrom, dateTo]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  const { summary, comparison, top_campaigns, channel_breakdown } = data;

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 주요 지표 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="총 광고비"
            value={summary.total_spend}
            change={comparison.spend_change}
            format="currency"
            icon="money"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="노출수"
            value={summary.total_impressions}
            change={comparison.impressions_change}
            format="number"
            icon="visibility"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="클릭수"
            value={summary.total_clicks}
            change={comparison.clicks_change}
            format="number"
            icon="mouse"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="ROAS"
            value={summary.avg_roas}
            change={comparison.roas_change}
            format="percentage"
            icon="trending_up"
          />
        </Grid>
      </Grid>

      {/* 차트 섹션 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                성과 트렌드
              </Typography>
              <TrendChart dateFrom={dateFrom} dateTo={dateTo} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                채널별 비중
              </Typography>
              <ChannelBreakdownChart data={channel_breakdown} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 상위 캠페인 테이블 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            성과 상위 캠페인
          </Typography>
          <TopCampaignsTable campaigns={top_campaigns} />
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardOverview;
```

### 2. 메트릭 카드 (MetricCard)

#### components/common/MetricCard.tsx
```typescript
import React from 'react';
import { Card, CardContent, Typography, Box, Icon } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  format: 'currency' | 'number' | 'percentage';
  icon?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, format, icon }) => {
  const formatValue = (val: number, fmt: string) => {
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency: 'KRW',
        }).format(val);
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'number':
        return new Intl.NumberFormat('ko-KR').format(val);
      default:
        return val.toString();
    }
  };

  const isPositive = change && change > 0;
  const changeColor = isPositive ? 'success.main' : 'error.main';

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          {icon && <Icon>{icon}</Icon>}
        </Box>
        <Typography variant="h4" component="div">
          {formatValue(value, format)}
        </Typography>
        {change !== undefined && (
          <Box display="flex" alignItems="center" mt={1}>
            {isPositive ? (
              <TrendingUpIcon sx={{ color: changeColor, fontSize: 16 }} />
            ) : (
              <TrendingDownIcon sx={{ color: changeColor, fontSize: 16 }} />
            )}
            <Typography variant="body2" sx={{ color: changeColor, ml: 0.5 }}>
              {Math.abs(change).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ ml: 0.5 }}>
              vs 이전 기간
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
```

### 3. 트렌드 차트 (TrendChart)

#### components/charts/TrendChart.tsx
```typescript
import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchTrendData } from '../../services/api';

interface TrendChartProps {
  dateFrom: string;
  dateTo: string;
}

const TrendChart: React.FC<TrendChartProps> = ({ dateFrom, dateTo }) => {
  const [metric, setMetric] = useState('revenue');

  const { data, isLoading } = useQuery({
    queryKey: ['trends', dateFrom, dateTo, metric],
    queryFn: () => fetchTrendData({ dateFrom, dateTo, metric, granularity: 'daily' }),
  });

  const handleMetricChange = (event: React.MouseEvent<HTMLElement>, newMetric: string) => {
    if (newMetric !== null) {
      setMetric(newMetric);
    }
  };

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <ToggleButtonGroup
          value={metric}
          exclusive
          onChange={handleMetricChange}
          size="small"
        >
          <ToggleButton value="revenue">매출</ToggleButton>
          <ToggleButton value="cost">광고비</ToggleButton>
          <ToggleButton value="conversions">전환</ToggleButton>
          <ToggleButton value="roas">ROAS</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data?.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value: number) => formatMetricValue(value, metric)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            strokeWidth={2}
            name={getMetricLabel(metric)}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

const getMetricLabel = (metric: string): string => {
  const labels: { [key: string]: string } = {
    revenue: '매출',
    cost: '광고비',
    conversions: '전환수',
    roas: 'ROAS',
  };
  return labels[metric] || metric;
};

const formatMetricValue = (value: number, metric: string): string => {
  if (metric === 'revenue' || metric === 'cost') {
    return `₩${value.toLocaleString()}`;
  }
  return value.toLocaleString();
};

export default TrendChart;
```

### 4. 채널 분석 차트 (ChannelBreakdownChart)

#### components/charts/ChannelBreakdownChart.tsx
```typescript
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ChannelData {
  channel: string;
  spend: number;
  revenue: number;
  roas: number;
}

interface ChannelBreakdownChartProps {
  data: ChannelData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ChannelBreakdownChart: React.FC<ChannelBreakdownChartProps> = ({ data }) => {
  const chartData = data.map((item) => ({
    name: getChannelDisplayName(item.channel),
    value: item.spend,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const getChannelDisplayName = (channel: string): string => {
  const displayNames: { [key: string]: string } = {
    google_search: 'Google 검색',
    google_display: 'Google 디스플레이',
    facebook: 'Facebook',
    instagram: 'Instagram',
    naver_search: '네이버 검색',
  };
  return displayNames[channel] || channel;
};

export default ChannelBreakdownChart;
```

### 5. 캠페인 테이블 (CampaignsTable)

#### components/campaigns/CampaignsTable.tsx
```typescript
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';

interface Campaign {
  id: number;
  campaign_name: string;
  platform: string;
  status: string;
  metrics: {
    cost: number;
    conversions: number;
    roas: number;
  };
}

interface CampaignsTableProps {
  campaigns: Campaign[];
}

const CampaignsTable: React.FC<CampaignsTableProps> = ({ campaigns }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'ended':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      active: '활성',
      paused: '일시중지',
      ended: '종료',
    };
    return labels[status] || status;
  };

  const getPlatformLabel = (platform: string) => {
    const labels: { [key: string]: string } = {
      google_ads: 'Google Ads',
      meta_ads: 'Meta Ads',
      naver_ads: '네이버 광고',
    };
    return labels[platform] || platform;
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>캠페인명</TableCell>
            <TableCell>플랫폼</TableCell>
            <TableCell>상태</TableCell>
            <TableCell align="right">광고비</TableCell>
            <TableCell align="right">전환수</TableCell>
            <TableCell align="right">ROAS</TableCell>
            <TableCell align="center">액션</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id} hover>
              <TableCell>{campaign.campaign_name}</TableCell>
              <TableCell>{getPlatformLabel(campaign.platform)}</TableCell>
              <TableCell>
                <Chip
                  label={getStatusLabel(campaign.status)}
                  color={getStatusColor(campaign.status)}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                ₩{campaign.metrics.cost.toLocaleString()}
              </TableCell>
              <TableCell align="right">
                {campaign.metrics.conversions.toLocaleString()}
              </TableCell>
              <TableCell align="right">{campaign.metrics.roas.toFixed(2)}</TableCell>
              <TableCell align="center">
                <Tooltip title="상세보기">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CampaignsTable;
```

### 6. 인사이트 카드 (InsightCard)

#### components/insights/InsightCard.tsx
```typescript
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CloseIcon from '@mui/icons-material/Close';

interface Insight {
  id: number;
  type: 'opportunity' | 'warning' | 'recommendation';
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  potential_impact: number;
  suggested_action: string;
}

interface InsightCardProps {
  insight: Insight;
  onDismiss?: (id: number) => void;
  onApply?: (id: number) => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, onDismiss, onApply }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'opportunity':
        return <TrendingUpIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'recommendation':
        return <LightbulbIcon color="info" />;
    }
  };

  const getPriorityColor = () => {
    switch (insight.priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
    }
  };

  const getTypeLabel = () => {
    const labels = {
      opportunity: '기회',
      warning: '경고',
      recommendation: '추천',
    };
    return labels[insight.type];
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" gap={1} flex={1}>
            {getIcon()}
            <Box flex={1}>
              <Box display="flex" gap={1} mb={1}>
                <Chip label={getTypeLabel()} size="small" color={getPriorityColor()} />
                <Chip label={insight.category} size="small" variant="outlined" />
              </Box>
              <Typography variant="h6" gutterBottom>
                {insight.title}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                {insight.description}
              </Typography>
              {insight.potential_impact && (
                <Typography variant="body2" color="primary" gutterBottom>
                  예상 효과: {insight.potential_impact > 0 ? '+' : ''}
                  {insight.potential_impact.toFixed(1)}%
                </Typography>
              )}
              {insight.suggested_action && (
                <Box
                  sx={{
                    bgcolor: 'action.hover',
                    p: 1.5,
                    borderRadius: 1,
                    mt: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    제안 조치:
                  </Typography>
                  <Typography variant="body2">{insight.suggested_action}</Typography>
                </Box>
              )}
              <Box display="flex" gap={1} mt={2}>
                {onApply && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => onApply(insight.id)}
                  >
                    적용하기
                  </Button>
                )}
                <Button variant="outlined" size="small">
                  자세히 보기
                </Button>
              </Box>
            </Box>
          </Box>
          {onDismiss && (
            <IconButton size="small" onClick={() => onDismiss(insight.id)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default InsightCard;
```

## API 서비스

### services/api.ts
```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 토큰 추가
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 에러 처리
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // 대시보드
  getDashboard: (params: { dateFrom: string; dateTo: string }) =>
    apiClient.get('/dashboard/overview', { params }),

  // 캠페인
  getCampaigns: (params?: any) => apiClient.get('/campaigns', { params }),
  getCampaign: (id: number) => apiClient.get(`/campaigns/${id}`),
  getCampaignPerformance: (id: number, params: any) =>
    apiClient.get(`/campaigns/${id}/performance`, { params }),

  // 인사이트
  getInsights: (params?: any) => apiClient.get('/insights', { params }),
  markInsightAsRead: (id: number) =>
    apiClient.patch(`/insights/${id}`, { is_read: true }),

  // 리포트
  getReports: () => apiClient.get('/reports'),
  createReport: (data: any) => apiClient.post('/reports', data),
  getReport: (id: number) => apiClient.get(`/reports/${id}`),
};

export default api;
```

## Redux 스토어

### store/slices/dashboardSlice.ts
```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (params: { dateFrom: string; dateTo: string }) => {
    const response = await api.getDashboard(params);
    return response.data;
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    data: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default dashboardSlice.reducer;
```

## 라우팅

### App.tsx
```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

// Pages
import DashboardPage from './pages/DashboardPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import InsightsPage from './pages/InsightsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

// Layout
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/auth/PrivateRoute';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
```
