// 💡 [수정됨] React에서 useEffect를 추가로 불러옵니다.
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useQuery } from '@tanstack/react-query';
import { insightsAPI, api } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Target,
  Send,
  CheckCircle2,
  FileText
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency, formatCompactNumber, getPlatformColor } from '@/lib/utils';

const TOUR_STEPS = [
  {
    targetId: 'tour-insights-header',
    title: '인사이트 & 리포트',
    description: '분석 대상 캠페인과 날짜 구간을 설정하여 전체적인 성과를 조회합니다.',
    position: 'bottom',
  },
  {
    targetId: 'tour-performance-summary',
    title: '성과 요약',
    description: '선택한 기간 동안의 노출, 클릭, 광고비, ROAS 등 주요 지표의 추이를 한눈에 확인합니다.',
    position: 'bottom',
  },
  {
    targetId: 'tour-trend-chart',
    title: '상대적 성과 추세',
    description: '각 지표별 흐름을 차트로 비교하여 기간별 성과 변화를 확인해 보세요.',
    position: 'top',
  },
  {
    targetId: 'tour-platform-comparison',
    title: '플랫폼 분석',
    description: '매체별 효율을 비교 분석하여 예산 분배 최적화 가이드를 확인합니다.',
    position: 'top',
  }
];

export default function InsightsPage() {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  
  // 튜토리얼 상태
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateRect = () => {
    if (!showTour) return;
    const targetElement = document.getElementById(TOUR_STEPS[tourStep].targetId);
    if (targetElement) {
      setTargetRect(targetElement.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (showTour) {
      const timer1 = setTimeout(updateRect, 100);
      const timer2 = setTimeout(updateRect, 400);
      
      window.addEventListener('resize', updateRect);
      window.addEventListener('scroll', updateRect, true);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        window.removeEventListener('resize', updateRect);
        window.removeEventListener('scroll', updateRect, true);
      };
    }
  }, [showTour, tourStep]);

  // 💡 [추가됨] 캠페인 선택 상태 관리 ('all'이면 모든 캠페인 종합 보기)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');

  // 💡 [추가됨] 백엔드에 뚫어둔 analyze API를 호출해서 '활성 캠페인 목록'을 가져옵니다.
  const { data: analyzeData } = useQuery({
    queryKey: ['ai-analyze-base'],
    queryFn: async () => {
      const response = await api.post('/ai/agent/analyze', { period: 30 });
      return response.data;
    }
  });

  // 추세 분석 데이터 (캠페인 ID 파라미터 추가)
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['insights-trends', dateRange, selectedCampaign],
    queryFn: () => insightsAPI.getTrends({
      start_date: dateRange.start,
      end_date: dateRange.end,
      campaign_id: selectedCampaign === 'all' ? undefined : selectedCampaign,
    }),
  });

  // 플랫폼 비교 데이터 (캠페인 ID 파라미터 추가)
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery({
    queryKey: ['insights-comparison', dateRange, selectedCampaign],
    queryFn: () => insightsAPI.getComparison({
      start_date: dateRange.start,
      end_date: dateRange.end,
      campaign_id: selectedCampaign === 'all' ? undefined : selectedCampaign,
    }),
  });

  const trends = trendsData?.data;
  const comparison = comparisonData?.data;
  // 💡 [추가됨] 드롭다운에 뿌려줄 캠페인 목록 데이터
  const availableCampaigns = analyzeData?.data?.availableCampaigns || [];

  // 💡 [추가됨] 페이지 최초 진입 시, 캠페인 목록 로딩이 끝나면 날짜를 전체 캠페인 최초 개시일로 자동 셋팅!
  useEffect(() => {
    if (availableCampaigns.length > 0 && selectedCampaign === 'all') {
      const today = new Date().toISOString().split('T')[0];
      const earliestDate = availableCampaigns.reduce((min: string, c: any) => {
        if (!c.start_date) return min;
        const cDate = new Date(c.start_date).toISOString().split('T')[0];
        return cDate < min ? cDate : min;
      }, today);

      // 이미 계산된 날짜와 다를 때만 업데이트 (무한 렌더링 방지)
      if (dateRange.start !== earliestDate) {
        setDateRange({ start: earliestDate, end: today });
      }
    }
  }, [availableCampaigns]); // availableCampaigns 데이터가 준비될 때 한 번 실행됩니다.

  // 💡 [추가됨] 캠페인 드롭다운 변경 시 시작 날짜를 해당 캠페인의 최초 개시일로 자동 업데이트합니다!
  const handleCampaignChange = (e: any) => {
    const val = e.target.value;
    setSelectedCampaign(val);
    
    const today = new Date().toISOString().split('T')[0];

    if (val === 'all') {
      // 전체 캠페인 중 가장 빠른 시작일 찾기
      const earliestDate = availableCampaigns.reduce((min: string, c: any) => {
        if (!c.start_date) return min;
        const cDate = new Date(c.start_date).toISOString().split('T')[0];
        return cDate < min ? cDate : min;
      }, today);
      setDateRange({ start: earliestDate, end: today });
    } else {
      // 선택한 캠페인의 시작일 찾기
      const targetCampaign = availableCampaigns.find((c: any) => c.id.toString() === val);
      if (targetCampaign && targetCampaign.start_date) {
        const cDate = new Date(targetCampaign.start_date).toISOString().split('T')[0];
        setDateRange({ start: cDate, end: today });
      } else {
        // 데이터가 없으면 기본 30일
        const fallbackStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setDateRange({ start: fallbackStart, end: today });
      }
    }
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f9fafb',
        logging: false,
        windowWidth: 1280,
        scrollX: 0,
        scrollY: -window.scrollY,
        onclone: (doc) => {
          const style = doc.createElement('style');
          style.innerHTML = `
            /* 전체 텍스트 수직 위치 보정 */
            * {
              font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif !important;
              letter-spacing: -0.02em !important; /* 자간 미세 조정으로 밀림 방지 */
              -webkit-font-smoothing: antialiased;
            }
            /* Recharts 등 SVG 텍스트가 아래로 처지는 현상 방지 */
            svg text {
              dominant-baseline: central !important;
              transform: translateY(1px); /* 브라우저 렌더링 오차만큼 보정 */
            }
            /* 테이블 셀 내부 텍스트 처짐 방지 */
            td, th {
              vertical-align: middle !important;
              line-height: 1.2 !important;
            }
          `;
          doc.head.appendChild(style);

          // 네이티브 폼 요소는 html2canvas에서 글자 간격이 틀어지므로 텍스트로 교체
          doc.querySelectorAll('select').forEach((sel) => {
            const span = doc.createElement('span');
            span.textContent = (sel as HTMLSelectElement).options[(sel as HTMLSelectElement).selectedIndex]?.text ?? '';
            span.style.cssText = 'font-size:14px;color:#1f2937;display:inline-block;vertical-align:middle;';
            sel.parentNode?.replaceChild(span, sel);
          });
          doc.querySelectorAll('input[type="date"]').forEach((input) => {
            const span = doc.createElement('span');
            span.textContent = (input as HTMLInputElement).value;
            span.style.cssText = 'font-size:14px;color:#1f2937;display:inline-block;vertical-align:middle;';
            input.parentNode?.replaceChild(span, input);
          });
        },
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const A4_W = 210, A4_H = 297, MARGIN = 10;
      const CONTENT_W = A4_W - MARGIN * 2;
      const imgW = canvas.width, imgH = canvas.height;
      const renderedH = (imgH * CONTENT_W) / imgW;
      let yOffset = 0, isFirstPage = true;

      while (yOffset < renderedH) {
        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;
        const pageH = A4_H - MARGIN * 2;
        const sliceH = Math.min(pageH, renderedH - yOffset);
        const srcY = (yOffset / renderedH) * imgH;
        const srcSliceH = (sliceH / renderedH) * imgH;

        const slice = document.createElement('canvas');
        slice.width = imgW;
        slice.height = Math.round(srcSliceH);
        const ctx = slice.getContext('2d')!;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, slice.width, slice.height);
        
        ctx.drawImage(canvas, 0, srcY, imgW, srcSliceH, 0, 0, imgW, Math.round(srcSliceH));
        pdf.addImage(slice.toDataURL('image/jpeg', 1.0), 'JPEG', MARGIN, MARGIN, CONTENT_W, sliceH);
        yOffset += sliceH;
      }

      const today = new Date().toISOString().split('T')[0];
      pdf.save(`ChannelAI_인사이트_${today}.pdf`);
    } catch (err) {
      console.error('PDF 생성 실패:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (trendsLoading || comparisonLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
    <div ref={contentRef} className="space-y-6 p-4 sm:p-6 mb-20 md:mb-0 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">인사이트 & 리포트</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">데이터 기반 성과 분석 및 최적화 제안</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setShowTour(true);
              setTourStep(0);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-sm font-medium"
          >
            <Target className="w-4 h-4" />
            <span>가이드</span>
          </button>
          <button
            onClick={() => navigate('/monthly-report')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">월별 리포트</span>
            <span className="sm:hidden">월별</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <div className="w-5 h-5 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Download className="w-5 h-5 mr-1" />
            )}
            <span className="hidden sm:inline">{isExporting ? '저장 중...' : 'PDF 다운로드'}</span>
            <span className="sm:hidden">{isExporting ? '저장 중' : '다운로드'}</span>
          </button>
        </div>
      </div>

      {/* Date Range & Campaign Selector */}
      <div id="tour-insights-header" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        {/* 💡 [추가됨] 캠페인 선택 드롭다운 UI */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Target className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 flex-shrink-0">분석 대상:</span>
          <select
            value={selectedCampaign}
            onChange={handleCampaignChange}
            className="w-full sm:w-auto min-w-[150px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">모든 캠페인 종합 보기</option>
            {availableCampaigns.map((campaign: any) => (
              <option key={campaign.id} value={campaign.id}>
                [{campaign.platform}] {campaign.campaign_name}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden sm:block w-px h-6 bg-gray-200"></div> {/* 구분선 */}

        {/* 기존 날짜 선택기 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 flex-shrink-0">분석 기간:</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
            />
            <span className="text-gray-500 flex-shrink-0">~</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
            />
          </div>
        </div>
      </div>

      {/* Performance Summary Cards */}
      {trends && (
        <div id="tour-performance-summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-gray-500">총 노출수</p>
              {getChangeIcon(trends.changes.impressions)}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCompactNumber(trends.current.impressions)}
            </p>
            <p className={`text-sm mt-1 ${getChangeColor(trends.changes.impressions)}`}>
              {trends.changes.impressions > 0 ? '+' : ''}
              {trends.changes.impressions.toFixed(1)}% 전 기간 대비
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">총 클릭수</p>
              {getChangeIcon(trends.changes.clicks)}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCompactNumber(trends.current.clicks)}
            </p>
            <p className={`text-sm mt-1 ${getChangeColor(trends.changes.clicks)}`}>
              {trends.changes.clicks > 0 ? '+' : ''}
              {trends.changes.clicks.toFixed(1)}% 전 기간 대비
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">총 광고비</p>
              {getChangeIcon(trends.changes.cost)}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(trends.current.cost)}
            </p>
            <p className={`text-sm mt-1 ${getChangeColor(trends.changes.cost)}`}>
              {trends.changes.cost > 0 ? '+' : ''}
              {trends.changes.cost.toFixed(1)}% 전 기간 대비
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">ROAS</p>
              {getChangeIcon(trends.changes.roas)}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(trends.current.cost > 0 ? trends.current.revenue / trends.current.cost : 0).toFixed(2)}x
            </p>
            <p className={`text-sm mt-1 ${getChangeColor(trends.changes.roas)}`}>
              {trends.changes.roas > 0 ? '+' : ''}
              {trends.changes.roas.toFixed(1)}% 전 기간 대비
            </p>
          </div>
        </div>
      )}

      {/* Performance Trend Chart */}
      {trends && trends.timeline && trends.timeline.length > 0 && (() => {
        // 1. 동적 스케일링을 위한 각 지표별 최소/최대값 추출
        const getMinMax = (key: string) => {
          const values = trends.timeline.map((d: any) => Number(d[key]) || 0);
          return { min: Math.min(...values), max: Math.max(...values) };
        };
        
        const bounds: Record<string, {min: number, max: number}> = {
          impressions: getMinMax('impressions'),
          clicks: getMinMax('clicks'),
          cost: getMinMax('cost'),
          conversions: getMinMax('conversions'),
        };

        // 2. 0~100 스케일로 정규화된 데이터 생성 (흐름 겹쳐 보기 용도)
        const normalizedTimeline = trends.timeline.map((d: any) => {
          const normalize = (key: string) => {
            const val = Number(d[key]) || 0;
            const { min, max } = bounds[key];
            if (max === min) return 50; // 변화가 없으면 중간 50% 선으로 유지
            return ((val - min) / (max - min)) * 100;
          };

          return {
            ...d, // 원본 데이터는 그대로 보존 (툴팁에 띄우기 위함)
            norm_impressions: normalize('impressions'),
            norm_clicks: normalize('clicks'),
            norm_cost: normalize('cost'),
            norm_conversions: normalize('conversions'),
          };
        });

        // 3. 커스텀 툴팁: 마우스 오버 시 비율(%)이 아닌 실제 '원본 숫자'를 보여줍니다.
        const CustomTooltip = ({ active, payload, label }: any) => {
          if (active && payload && payload.length) {
            const data = payload[0].payload; 
            return (
              <div className="bg-white p-3 border border-gray-200 shadow-md rounded-lg text-sm">
                <p className="font-bold text-gray-700 mb-2">{new Date(label).toLocaleDateString('ko-KR')}</p>
                <p className="text-blue-600 font-medium">노출수: {formatCompactNumber(data.impressions)}</p>
                <p className="text-green-600 font-medium">클릭수: {formatCompactNumber(data.clicks)}</p>
                <p className="text-yellow-600 font-medium">광고비: {formatCurrency(data.cost)}</p>
                <p className="text-purple-600 font-medium">전환수: {formatCompactNumber(data.conversions)}</p>
              </div>
            );
          }
          return null;
        };

        return (
          <div id="tour-trend-chart" className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
              <h2 className="text-lg font-semibold text-gray-900">상대적 성과 추세</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">※ 각 지표 최고점 기준 흐름 비교</span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={normalizedTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tickFormatter={(val) => `${val}%`} 
                  tick={{ fontSize: 11, fill: '#9CA3AF' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                {/* 💡 type을 'linear'로 변경하여 직선으로 만들고, dot={{ r: 3 }}을 주어 각 지점에 점을 찍습니다! */}
                <Line type="linear" dataKey="norm_impressions" stroke="#3B82F6" name="노출 추세" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="linear" dataKey="norm_clicks" stroke="#10B981" name="클릭 추세" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="linear" dataKey="norm_cost" stroke="#F59E0B" name="비용 추세" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="linear" dataKey="norm_conversions" stroke="#8B5CF6" name="전환 추세" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
            
          </div>
        );
      })()}

      {/* Platform Comparison */}
      {comparison && comparison.platforms && comparison.platforms.length > 0 && (
        <div id="tour-platform-comparison" className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Performance Chart */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">플랫폼별 광고비 분포</h2>
              <div className="h-[250px] sm:h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={comparison.platforms}
                      dataKey="cost"
                      nameKey="platform"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.platform} (${entry.cost_share.toFixed(1)}%)`}
                    >
                      {comparison.platforms.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform ROAS Comparison */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">플랫폼별 ROAS 비교</h2>
              <div className="h-[250px] sm:h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison.platforms}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)}x`} />
                    <Legend />
                    <Bar dataKey="roas" fill="#10B981" name="ROAS" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Platform Performance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">플랫폼 성과 비교</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">플랫폼</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">캠페인 수</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">노출수</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">클릭수</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">전환수</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">광고비</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparison.platforms.map((platform: any) => (
                  <tr key={platform.platform} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPlatformColor(platform.platform)}`}>
                        {platform.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {platform.campaign_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCompactNumber(platform.impressions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCompactNumber(platform.clicks)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {(platform.ctr ?? 0).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCompactNumber(platform.conversions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(platform.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      <span className={(platform.roas ?? 0) >= 2 ? 'text-green-600' : (platform.roas ?? 0) >= 1 ? 'text-yellow-600' : 'text-red-600'}>
                        {(platform.roas ?? 0).toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
        </div>
        </div>
      )}


    </div>

    {/* --- 튜토리얼 오버레이 --- */}
    {showTour && TOUR_STEPS[tourStep] && (
      <div className="fixed inset-0 z-[100] pointer-events-auto">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="tour-insights-hole">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.x - 8}
                  y={targetRect.y - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  fill="black"
                  rx="12"
                  className="transition-all duration-500 ease-in-out"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#tour-insights-hole)"
            className="transition-all duration-500"
          />
        </svg>

        {targetRect && (
          <div
            className="absolute z-[101] transition-all duration-500 ease-in-out"
            style={{
              ...(() => {
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
                const boxWidth = Math.min(320, screenWidth - 32);
                let leftPos = targetRect.x + targetRect.width / 2 - boxWidth / 2;
                leftPos = Math.max(16, Math.min(leftPos, screenWidth - boxWidth - 16));

                const position = TOUR_STEPS[tourStep].position;
                if (position === 'top') {
                  const topPos = targetRect.y - (isMobile ? 180 : 190);
                  return { top: Math.max(16, topPos), left: leftPos, width: boxWidth };
                }
                return { top: targetRect.y + targetRect.height + 24, left: leftPos, width: boxWidth };
              })()
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-5 relative animate-in fade-in zoom-in duration-300">
              <div className={`absolute w-4 h-4 bg-white rotate-45 transition-all duration-300 ${
                TOUR_STEPS[tourStep].position === 'top'
                  ? "-bottom-2 left-1/2 -translate-x-1/2"
                  : "-top-2 left-1/2 -translate-x-1/2"
              }`} />

              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                    {tourStep + 1}
                  </div>
                  <span className="font-bold text-gray-900 text-lg">
                    {TOUR_STEPS[tourStep].title}
                  </span>
                </div>

                <p className="text-gray-600 text-sm sm:text-base leading-relaxed break-keep">
                  {TOUR_STEPS[tourStep].description}
                </p>

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-400">
                    {tourStep + 1} / {TOUR_STEPS.length}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTour(false)}
                      className="px-3 py-1.5 text-xs sm:text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      건너뛰기
                    </button>

                    {tourStep < TOUR_STEPS.length - 1 ? (
                      <button
                        onClick={() => setTourStep(prev => prev + 1)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        다음 <Send className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowTour(false)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        시작하기 <CheckCircle2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
    </>
  );
}
