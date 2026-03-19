// [2026-03-12 15:32] 캠페인별 성과 탭 추가 - useMemo 추가
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell, PieChart, Pie
} from "recharts";
import { LayoutDashboard, DownloadCloud, Sparkles, RefreshCcw, Mail, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

// ─── 유틸 ────────────────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = { meta: "#3b82f6", google: "#ef4444", naver: "#22c55e", karrot: "#f97316" };
const PLATFORM_LABELS: Record<string, string> = { meta: "Meta", google: "Google", naver: "Naver", karrot: "Karrot" };

/**
 * 숫자를 한국어 단위(만, 억)로 변환해주는 유틸 함수
 * @param n 대상 숫자
 * @param unit 뒤에 붙일 단위 (예: '원', '건' 등)
 * @returns 포맷팅된 문자열 (예: '1.2억', '5.4만', '1,234')
 */
const fmt = (n: number, unit = "") => {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억${unit}`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만${unit}`;
  return `${n.toLocaleString()}${unit}`;
};

/**
 * 한국 원화(₩) 포맷팅 함수
 * @param n 금액 (숫자)
 * @returns 포맷팅된 금액 금액 (예: '₩1.2억')
 */
const fmtKRW = (n: number) => `₩${fmt(n)}`;

/**
 * YYYY-MM 형태의 월 문자열을 사용자 친화적 라벨로 변환
 * @param m 월 문자열 (예: '2025-09')
 * @returns 변환된 문자열 (예: "'25.09")
 */
const fmtLabel = (m: string) => m.replace("20", "'").replace("-", ".");

/**
 * 이전 대비 증감률을 계산해주는 함수
 * @param cur 현재 값
 * @param prev 이전 값
 * @returns 증감률 퍼센트 (정수)
 */
const diff = (cur: number, prev: number) => prev === 0 ? 0 : Math.round((cur - prev) / prev * 100);

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

/**
 * 증감률을 시각적으로 표시해주는 작은 뱃지 컴포넌트
 * (양의 변화면 녹색(▲), 음의 변화면 붉은색(▼))
 */
const Badge = ({ value }: { value: number }) => {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md leading-none ${
      up ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
    }`}>
      {up ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
};

/**
 * 핵심 성과 지표(KPI)를 표시하는 공통 상단 요약 카드 컴포넌트
 */
const KpiCard = ({ label, value, sub, delta, icon }: any) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition relative group">
    <div className="flex justify-between items-start mb-2">
      <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">{label}</span>
      <span className="text-xl">{icon}</span>
    </div>
    <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs text-gray-400 leading-none">{sub}</span>
      {delta !== undefined && <Badge value={delta} />}
    </div>
  </div>
);

/**
 * 각 차트나 표 상단에 표시되는 제목 영역 컴포넌트
 */
const SectionTitle = ({ children, sub }: any) => (
  <div className="mb-5">
    <h2 className="text-base font-bold text-gray-800">{children}</h2>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

/**
 * Recharts 차트 Hover 시 표시되는 툴팁의 커스텀 포맷터
 * (숫자가 클 경우 fmtKRW 등으로 보정, 보기 좋게 박스 스타일링)
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-xl p-3 text-xs z-50">
      <div className="font-bold text-gray-800 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }} className="leading-relaxed">
          {p.name}: <strong className="font-semibold">{typeof p.value === "number" && p.value > 100000 ? fmtKRW(p.value) : p.value?.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

/**
 * 월별 광고 성과 보고서를 렌더링하는 메인 페이지 컴포넌트.
 * 종합 요약, 배체별 분석, 시계열 추이 분석 등 다각적 리포팅 제공
 */
export default function MonthlyReportPage() {
  // [2026-03-13] 사용자 이메일 자동 사용 - prompt() 입력 제거
  const { user } = useAuthStore();
  const isPro = user?.plan === 'PRO';
  const navigate = useNavigate();

  // 백엔드에서 받아온 전체 월별 데이터맵 객체
  const [monthlyData, setMonthlyData] = useState<Record<string, any>>({});
  
  // 데이터에 존재하는 기준 월 배열
  const [MONTHS, setMONTHS] = useState<string[]>([]);
  
  // 현재 뷰어에서 보고 있는 기준월(ex: 2026-03)
  const [selectedMonth, setSelectedMonth] = useState("");
  
  // 증감률 비교를 위해 내부 관리되는 직전 월(ex: 2026-02)
  const [prevMonth, setPrevMonth] = useState("");
  
  // 현재 선택된 탭 정보 (overview | platform | trend)
  const [activeTab, setActiveTab] = useState("overview");
  
  // 화면 리렌더링 및 페이드인 애니메이션 리셋을 위한 키 변수
  const [animKey, setAnimKey] = useState(0);
  
  // API 로딩 상태 플래그
  const [isLoading, setIsLoading] = useState(true);
  
  // PDF 내보내기 중인지 여부 (모든 탭을 렌더링하기 위함)
  const [isExporting, setIsExporting] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('pdfMode') === 'true';
    }
    return false;
  });

  // 이메일 발송 관련 상태
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [emailTarget, setEmailTarget] = useState('');
  const [emailSending, setEmailSending] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // const reportRef = useRef<HTMLDivElement>(null);

  // 리포트 렌더 영역 요소를 추적하기 위한 ref
  
  /**
   * [2026-03-12 16:05] 수정 이유: 리포트 캡처 및 정렬을 위한 필수 객체 선언부
   * 상세 설명: 각 탭별(종합, 채널, 추이, 캠페인) DOM 요소를 참조하여 PDF 캡처 시 활용하며, 
   * 캠페인 데이터의 실시간 정렬(Sort) 및 가공을 위한 Hook들임. Early Return 규칙 준수를 위해 최상단에 배치.
   */
  const overviewRef       = useRef<HTMLDivElement>(null);
  const platformRef       = useRef<HTMLDivElement>(null);
  const trendRef          = useRef<HTMLDivElement>(null);
  const campaignRef       = useRef<HTMLDivElement>(null);
  const campaignTableRef  = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [campaignSort, setCampaignSort] = useState<{ key: string; asc: boolean }>({ key: 'cost', asc: false });
  const campaigns = useMemo(() => {
    const list: any[] = (monthlyData[selectedMonth] as any)?.campaigns || [];
    return [...list].sort((a: any, b: any) => {
      const aVal = a[campaignSort.key] ?? 0;
      const bVal = b[campaignSort.key] ?? 0;
      if (typeof aVal === 'string') return campaignSort.asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return campaignSort.asc ? aVal - bVal : bVal - aVal;
    });
  }, [monthlyData, selectedMonth, campaignSort]);

  // 🤖 [DB 조회 연동]: 기존에 생성되어 저장된 월별 분석 내용이 있는지 DB에서 가져옵니다.
  const { data: dbInsightsData, isLoading: isDbInsightsLoading } = useQuery({
    queryKey: ['monthlyInsights', selectedMonth],
    queryFn: async () => {
      if (!selectedMonth) return null;
      // 🧐 백엔드 GET 엔드포인트: 이미 저장된 JSON 데이터를 파싱해서 반환함
      const res = await api.get(`/ai/agent/monthly-report-insights?month=${selectedMonth}`);
      if (res.data?.success && res.data?.data) {
        return res.data.data; // 파싱된 JSON 객체
      }
      return null;
    },
    enabled: !!selectedMonth,
    staleTime: 5 * 60 * 1000,
  });

  // 🤖 [2026-03-12 17:52] 수동 리포트 분석용 LLM Mutation 추가 / DB 자동 저장
  const llmMutation = useMutation({
    mutationFn: async (forceRefresh: boolean = false) => {
      const curData = monthlyData[selectedMonth];
      if (!curData) return null;

      // 트렌드 데이터 (최근 6개월)
      const trendsData = MONTHS.slice(-6).map(m => ({
        month: m,
        cost: monthlyData[m].cost,
        revenue: monthlyData[m].revenue,
        conversions: monthlyData[m].conversions,
        clicks: monthlyData[m].clicks,
        roas: monthlyData[m].roas,
      }));

      // 플랫폼 데이터 (현재 월)
      const platformData = Object.entries(curData.platforms || {}).map(([k, v]: any) => ({
        platform: k,
        spend: v.spend,
        impressions: v.impressions,
        clicks: v.clicks,
        conversions: v.conversions,
        roas: v.spend > 0 ? (curData.revenue * (v.spend/curData.cost)) / v.spend * 100 : 0 // 단순 배분 가정
      }));

      // 🤖 DB에 저장하고 가져오는 POST 엔드포인트 호출 (캠페인 데이터 추가 전달)
      const response = await api.post('/ai/agent/monthly-report-insights', {
        trendsData,
        platformData,
        campaignData: campaigns, // 캠페인별 분석을 위해 추가 전달
        forceRefresh,
        reportType: 'monthly',
        selectedMonth
      });
      return response.data; // { success: true, data: { overall, campaigns... } }
    }
  });

  // LLM Mutation 결과 우선, 없으면 DB 데이터 사용
  const llmInsightData = llmMutation.data?.data;
  const insights = llmInsightData || dbInsightsData;
  const isLlmLoading = llmMutation.isPending || isDbInsightsLoading;

  // 월(month)이 변경되면 활성화된 LLM(mutation) 상태를 리셋
  useEffect(() => {
    llmMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  /**
   * 컴포넌트 최초 마운트 시, API에서 월별 리포트 데이터를 호출하여 가공 및 상태에 저장합니다.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const toMonthStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const endMonth = toMonthStr(now);
        const startMonth = toMonthStr(new Date(now.getFullYear(), now.getMonth() - 5, 1));
        const res = await api.get(`/report/monthly?startMonth=${startMonth}&endMonth=${endMonth}`);
        if (res.data?.success && res.data?.data) {
          const mData = res.data.data;
          setMonthlyData(mData);
          const sorted = Object.keys(mData).sort();
          setMONTHS(sorted);
          
          // URL 파라미터 확인 (?month=2026-02&export=true)
          const params = new URLSearchParams(window.location.search);
          const urlMonth = params.get('month');
          // [2026-03-13] 디폴트를 전월(현재월 -1)로 설정 (없으면 가장 최근 월로 폴백)
          const prevMonthStr = toMonthStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
          const finalMonth = mData[urlMonth || '']
            ? urlMonth!
            : (mData[prevMonthStr] ? prevMonthStr : (sorted[sorted.length - 1] || ''));
          if (finalMonth) setSelectedMonth(finalMonth);

          // 백엔드 Puppeteer가 방문할 때 (pdfMode=true) 모든 탭을 화면에 렌더링하도록 강제
          if (params.get('pdfMode') === 'true') {
            setIsExporting(true);
          }
        }
      } catch (err) {
        console.error('데이터 로드 실패:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  /**
   * 사용자가 현재 보고 있는 월(selectedMonth)을 변경하면,
   * 과거 비교를 위한 prevMonth값을 재계산하고, UI 애니메이션을 재시작합니다.
   */
  useEffect(() => {
    if (MONTHS.length > 0 && selectedMonth) {
      const idx = MONTHS.indexOf(selectedMonth);
      setPrevMonth(idx > 0 ? MONTHS[idx - 1] : MONTHS[0]);
      setAnimKey(k => k + 1);
    }
  }, [selectedMonth, MONTHS]);

  /**
   * 서버 API(Puppeteer)를 호출하여 완벽한 PDF 파일을 다운로드합니다.
   */
  const handleDownloadPDF = async () => {
    setIsExporting(true);

    if (user?.plan === 'PRO' && !insights) {
      try {
        await llmMutation.mutateAsync(false);
      } catch (e) {
        console.warn('PRO 플랜 AI 분석 자동 실행 실패, PDF는 계속 진행:', e);
      }
    }

    try {
      const response = await api.get(`/report/generate-pdf?month=${selectedMonth}&type=monthly`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ChannelAI_통합리포트_${selectedMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF 생성 실패:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  /** PDF 생성 후 이메일로 발송 */
  const handleSendByEmail = async () => {
    if (!emailTarget.trim()) return;
    setEmailSending('loading');
    
    // 이메일 발송 동안 버튼 중복 클릭 방지 (isExporting 대신 별도 로딩 인디케이터 사용)

    try {
      // 서버에서 직접 PDF를 캡처하여 이메일로 발송하도록 파라미터만 전송합니다.
      await api.post('/report/send-pdf', {
        email: emailTarget.trim(),
        month: selectedMonth
      });

      setEmailSending('success');
      setTimeout(() => { setEmailSending('idle'); setShowEmailPanel(false); }, 3000);
    } catch (err) {
      console.error('이메일 발송 실패:', err);
      setEmailSending('error');
      setTimeout(() => setEmailSending('idle'), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-medium flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          데이터를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (MONTHS.length === 0 || !monthlyData[selectedMonth]) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-medium">조회할 수 있는 월별 데이터가 없습니다.</div>
      </div>
    );
  }

  const cur = monthlyData[selectedMonth];
  const defaultZeros = { cost: 0, revenue: 0, conversions: 0, roas: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, platforms: {} };
  const prev = monthlyData[prevMonth] || defaultZeros;

  // 트렌드 차트용 데이터 (선택 월 포함 최근 6개)
  const trendData = MONTHS.slice(-6).map(m => ({
    month: fmtLabel(m),
    비용: monthlyData[m].cost,
    매출: monthlyData[m].revenue,
    전환: monthlyData[m].conversions,
    클릭: monthlyData[m].clicks,
    ROAS: monthlyData[m].roas,
  }));

  // 플랫폼 파이 데이터
  const platformPie = Object.entries(cur.platforms || {}).map(([k, v]: any) => ({
    name: PLATFORM_LABELS[k], value: v.spend, color: PLATFORM_COLORS[k]
  }));

  // 플랫폼 바 차트용
  const platformBar = Object.entries(cur.platforms || {}).map(([k, v]: any) => ({
    name: PLATFORM_LABELS[k],
    광고비: v.spend, 노출: v.impressions, 클릭: v.clicks, 전환: v.conversions,
    color: PLATFORM_COLORS[k]
  }));

  // 레이더 차트 (전월 대비)
  const radarData = [
    { metric:"노출", cur: cur.impressions / 10000, prev: prev.impressions / 10000 },
    { metric:"클릭", cur: cur.clicks / 100, prev: prev.clicks / 100 },
    { metric:"전환", cur: cur.conversions, prev: prev.conversions },
    { metric:"매출", cur: cur.revenue / 100000, prev: prev.revenue / 100000 },
    { metric:"ROAS", cur: cur.roas, prev: prev.roas },
    { metric:"CTR", cur: cur.ctr * 100, prev: prev.ctr * 100 },
  ];

  // [2026-03-12 15:32] 캠페인별 성과 탭 추가
  const TABS = [
    { id:"overview", label:"📊 종합 현황" },
    { id:"trend",    label:"📈 추이 분석" },
    { id:"platform", label:"📡 채널별 분석" },
    { id:"campaign", label:"📋 캠페인별 성과" },
  ];


  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex flex-col">
      {/* ── 헤더 ── */}
      <div className="pdf-header-container bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard className="text-blue-600" size={24} />
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  월별 성과 보고서
                </h1>
              </div>
              <p className="text-sm text-gray-500">
                멀티채널 광고 통합 요약 및 데이터 분석 리포트
              </p>
            </div>

            {/* 월 선택 및 액션 버튼 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-2 items-center bg-gray-50/80 p-1.5 rounded-xl border border-gray-100">
                <select 
                  value={selectedMonth.split('-')[0]}
                  onChange={(e) => {
                    const newYear = e.target.value;
                    const monthsInYear = MONTHS.filter(m => m.startsWith(newYear)).map(m => m.split('-')[1]);
                    const curMonth = selectedMonth.split('-')[1];
                    if (monthsInYear.includes(curMonth)) {
                      setSelectedMonth(`${newYear}-${curMonth}`);
                    } else {
                      setSelectedMonth(`${newYear}-${monthsInYear[monthsInYear.length - 1]}`);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {Array.from(new Set(MONTHS.map(m => m.split('-')[0]))).map(year => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
                
                <select
                  value={selectedMonth.split('-')[1]}
                  onChange={(e) => setSelectedMonth(`${selectedMonth.split('-')[0]}-${e.target.value}`)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {MONTHS.filter(m => m.startsWith(selectedMonth.split('-')[0]))
                    .map(m => m.split('-')[1])
                    .map(month => (
                      <option key={month} value={month}>{parseInt(month, 10)}월</option>
                  ))}
                </select>
              </div>

              
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {/* PDF 다운로드 */}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isExporting || emailSending === 'loading'}
                    className="print:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting && emailSending !== 'loading' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        PDF 렌더링 중...
                      </>
                    ) : (
                      <>
                        <DownloadCloud size={18} />
                        PDF 저장
                      </>
                    )}
                  </button>

                  {/* 이메일 발송 버튼 */}
                  <button
                    onClick={() => {
                      setEmailTarget(user?.email || '');
                      setShowEmailPanel(v => !v);
                    }}
                    disabled={isExporting || emailSending === 'loading'}
                    className="print:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail size={16} />
                    이메일 발송
                  </button>
                </div>

                {/* 이메일 입력 패널 */}
                {showEmailPanel && (
                  <div className="print:hidden flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-3 py-2 shadow-md">
                    <input
                      type="email"
                      value={emailTarget}
                      onChange={e => setEmailTarget(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendByEmail()}
                      placeholder="이메일 주소 입력"
                      className="text-sm border-none outline-none w-52 text-gray-700 placeholder-gray-400"
                    />
                    <button
                      onClick={handleSendByEmail}
                      disabled={emailSending === 'loading' || !emailTarget.trim()}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {emailSending === 'loading' ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : emailSending === 'success' ? '발송 완료 ✓' : emailSending === 'error' ? '실패 ✗' : '발송'}
                    </button>
                    <button onClick={() => setShowEmailPanel(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-4">
            {/* 탭 네비게이션 */}
            <div className="flex gap-2 print:hidden overflow-x-auto no-scrollbar border-b border-gray-100">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} 
                  className={`px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === t.id 
                      ? "border-blue-600 text-blue-700" 
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* [2026-03-13] 스마트 AI 변경: 캘린더 기간 표시 및 AI 분석 버튼을 탭 아래 라인으로 이동 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {selectedMonth && (() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                const today = new Date();
                const isCurrentMonth = y === today.getFullYear() && m === (today.getMonth() + 1);
                const firstDay = `${y}년 ${m}월 01일`;
                const lastDate = isCurrentMonth ? today.getDate() : new Date(y, m, 0).getDate();
                const lastDay  = `${y}년 ${m}월 ${String(lastDate).padStart(2, '0')}일`;
                return (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-semibold text-blue-700 shadow-sm print:hidden">
                    <span>📅</span>
                    <span>조회 기간: {firstDay} ~ {lastDay}</span>
                    {isCurrentMonth && (
                      <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white rounded-full text-[10px] font-bold">진행중</span>
                    )}
                  </div>
                );
              })()}

              {/* 🤖 AI 분석 갱신 버튼 (날짜와 같은 라인 끝에 배치) */}
              {isPro ? (
                <button
                  onClick={() => llmMutation.mutate(true)}
                  disabled={isLlmLoading || isExporting}
                  className="print:hidden flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <RefreshCcw size={16} className={`${isLlmLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
                  {isLlmLoading ? "AI 분석 리포트 생성 중..." : (insights ? "분석 리포트 갱신" : "AI 분석 리포트 생성")}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/payment')}
                  className="print:hidden flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-all bg-gray-100 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 border border-dashed border-gray-300 group"
                >
                  <Sparkles size={16} />
                  PRO 전용 · AI 분석
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 바디 ── */}
      <div className="flex-grow flex flex-col items-center">
        <div ref={reportRef} className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" key={animKey}>

          {/* ===== 탭 1: 종합 현황 ===== */}
          <div ref={overviewRef} className={`${(activeTab === "overview" || isExporting) ? "block" : "hidden"} ${!isExporting ? 'animate-fade-in-up' : ''} space-y-6 ${isExporting ? 'mb-24 page-break-after' : ''}`}>

              {/* 🤖 [2026-03-13] 각 탭 내부에 AI 분석 블록 표시 (overall) */}
              {(isPro || insights?.overall) ? (
                <div className="bg-indigo-50/40 border-2 border-dashed border-indigo-500/50 rounded-xl p-5 relative print:hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l-xl opacity-70" />
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 px-2 bg-indigo-500 text-white rounded-md flex items-center gap-1.5 shadow-sm">
                      <Sparkles size={12} />
                      <span className="text-[10px] font-black uppercase tracking-wider">AI 인공지능 종합 진단 리포트</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed font-medium">
                    {isLlmLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-indigo-100/50 animate-pulse rounded w-full" />
                        <div className="h-4 bg-indigo-100/50 animate-pulse rounded w-5/6" />
                      </div>
                    ) : (
                      insights?.overall || "⚠️ 요약된 상세 분석 데이터가 없습니다. 상단 'AI 분석 갱신' 버튼을 클릭해주세요."
                    )}
                  </div>
                </div>
              ) : (
                <div className="print:hidden flex items-center gap-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 text-sm text-gray-400">
                  <Sparkles size={16} className="text-indigo-300 shrink-0" />
                  <span>AI 종합 진단은 <button onClick={() => navigate('/payment')} className="text-indigo-500 font-bold hover:underline">PRO 요금제</button>에서만 이용할 수 있습니다.</span>
                </div>
              )}
              {/* KPI 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="총 광고비" value={fmtKRW(cur.cost)} sub={`전월 ${fmtKRW(prev.cost)}`} delta={diff(cur.cost, prev.cost)} icon="💰" accent="#6366f1" />
                <KpiCard label="총 매출" value={fmtKRW(cur.revenue)} sub={`전월 ${fmtKRW(prev.revenue)}`} delta={diff(cur.revenue, prev.revenue)} icon="📈" accent="#22d3ee" />
                <KpiCard label="총 전환" value={`${cur.conversions.toLocaleString()}건`} sub={`전월 ${prev.conversions.toLocaleString()}건`} delta={diff(cur.conversions, prev.conversions)} icon="🎯" accent="#a78bfa" />
                <KpiCard label="ROAS" value={`${cur.roas}%`} sub={`전월 ${prev.roas}%`} delta={diff(cur.roas, prev.roas)} icon="⚡" accent="#f59e0b" />
                
                <KpiCard label="총 노출" value={fmt(cur.impressions)} sub={`전월 ${fmt(prev.impressions)}`} delta={diff(cur.impressions, prev.impressions)} icon="👁" accent="#34d399" />
                <KpiCard label="총 클릭" value={fmt(cur.clicks)} sub={`전월 ${fmt(prev.clicks)}`} delta={diff(cur.clicks, prev.clicks)} icon="🖱" accent="#f472b6" />
                <KpiCard label="평균 CTR" value={`${cur.ctr}%`} sub={`전월 ${prev.ctr}%`} delta={diff(cur.ctr, prev.ctr)} icon="📌" accent="#fb923c" />
                <KpiCard label="평균 CPC" value={`₩${cur.cpc.toLocaleString()}`} sub={`전월 ₩${prev.cpc.toLocaleString()}`} delta={diff(cur.cpc, prev.cpc) * -1} icon="💡" accent="#38bdf8" />
              </div>

              {/* 전월 대비 레이더 + 채널 비중 파이 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 레이더 */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <SectionTitle sub="전월 대비 6개 지표 종합 비교">전월 대비 성과 트렌드</SectionTitle>
                  <ResponsiveContainer minWidth={0} width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill:"#6b7280", fontSize:12, fontWeight: 500 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Radar name={fmtLabel(prevMonth)} dataKey="prev" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.2} strokeWidth={2} strokeDasharray="4 4" />
                      <Radar name={fmtLabel(selectedMonth)} dataKey="cur" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    {[{c:"#cbd5e1",l:fmtLabel(prevMonth)},{c:"#3b82f6",l:fmtLabel(selectedMonth)}].map(x => (
                      <div key={x.l} className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <div style={{ width:12, height:12, background:x.c, borderRadius:2 }} />{x.l}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 파이 */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <SectionTitle sub="채널별 광고 예산 집행 비중">채널 예산 비중</SectionTitle>
                  <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                    <ResponsiveContainer minWidth={0} width="100%" height={240} className="flex-1">
                      <PieChart>
                        <Pie data={platformPie} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4}>
                          {platformPie.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full sm:w-48 flex flex-col gap-3">
                      {platformPie.map((p: any) => (
                        <div key={p.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div style={{ width:10, height:10, borderRadius:3, background:p.color }} />
                            <span className="text-xs font-semibold text-gray-600">{p.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">{fmtKRW(p.value)}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{Math.round(p.value / cur.cost * 100)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 요약 테이블 */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <SectionTitle sub="선택 월 전체 지표 및 전월 비교 상세 값">성과 요약 테이블</SectionTitle>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                      <tr>
                        {["지표","당월 값","전월 값","증가량","증감률"].map((h, i) => (
                          <th key={h} className={`px-6 py-4 uppercase text-xs tracking-wider ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { label:"총 노출수", cur:fmt(cur.impressions), prev:fmt(prev.impressions), delta:diff(cur.impressions,prev.impressions) },
                        { label:"총 클릭수", cur:fmt(cur.clicks), prev:fmt(prev.clicks), delta:diff(cur.clicks,prev.clicks) },
                        { label:"총 광고비", cur:fmtKRW(cur.cost), prev:fmtKRW(prev.cost), delta:diff(cur.cost,prev.cost) },
                        { label:"총 전환수", cur:`${cur.conversions.toLocaleString()}건`, prev:`${prev.conversions.toLocaleString()}건`, delta:diff(cur.conversions,prev.conversions) },
                        { label:"총 매출", cur:fmtKRW(cur.revenue), prev:fmtKRW(prev.revenue), delta:diff(cur.revenue,prev.revenue) },
                        { label:"평균 CTR", cur:`${cur.ctr}%`, prev:`${prev.ctr}%`, delta:diff(cur.ctr,prev.ctr) },
                        { label:"평균 CPC", cur:`₩${cur.cpc.toLocaleString()}`, prev:`₩${prev.cpc.toLocaleString()}`, delta:diff(cur.cpc,prev.cpc)*-1 },
                        { label:"ROAS", cur:`${cur.roas}%`, prev:`${prev.roas}%`, delta:diff(cur.roas,prev.roas) },
                      ].map((row) => (
                        <tr key={row.label} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-700">{row.label}</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">{row.cur}</td>
                          <td className="px-6 py-4 text-right text-gray-500">{row.prev}</td>
                          <td className="px-6 py-4 text-right"><Badge value={row.delta} /></td>
                          <td className={`px-6 py-4 text-right font-bold ${row.delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {row.delta >= 0 ? "+" : ""}{row.delta}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>

          {/* ===== 탭 3: 추이 분석 ===== */}
          <div  ref={trendRef} className={`${(activeTab === "trend" || isExporting) ? "block" : "hidden"} ${!isExporting ? 'animate-fade-in-up' : ''} space-y-6 ${isExporting ? 'mb-24 page-break-after' : ''}`}>
              
              {/* 🤖 [2026-03-13] 각 탭 내부에 AI 분석 블록 표시 (trendSummary) */}
              {(isPro || insights?.trendSummary) ? (
                <div className="bg-indigo-50/40 border-2 border-dashed border-indigo-500/50 rounded-xl p-5 relative print:hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l-xl opacity-70" />
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 px-2 bg-indigo-500 text-white rounded-md flex items-center gap-1.5 shadow-sm">
                      <Sparkles size={12} />
                      <span className="text-[10px] font-black uppercase tracking-wider">AI 인공지능 최근 6개월 추세 진단</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed font-medium">
                    {isLlmLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-indigo-100/50 animate-pulse rounded w-full" />
                        <div className="h-4 bg-indigo-100/50 animate-pulse rounded w-5/6" />
                      </div>
                    ) : (
                      insights?.trendSummary || "⚠️ 요약된 상세 분석 데이터가 없습니다. 상단 'AI 분석 갱신' 버튼을 클릭해주세요."
                    )}
                  </div>
                </div>
              ) : (
                <div className="print:hidden flex items-center gap-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 text-sm text-gray-400">
                  <Sparkles size={16} className="text-indigo-300 shrink-0" />
                  <span>AI 추세 진단은 <button onClick={() => navigate('/payment')} className="text-indigo-500 font-bold hover:underline">PRO 요금제</button>에서만 이용할 수 있습니다.</span>
                </div>
              )}

              {/* 광고비 & 매출 추이 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <SectionTitle sub="최근 6개월 광고비 지출 대비 매출 획득 변화 트렌드">광고비 · 매출 트렌드 (최근 6개월)</SectionTitle>
                <ResponsiveContainer minWidth={0} width="100%" height={320}>
                  <AreaChart data={trendData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fill:"#6b7280", fontSize:12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v,"원")} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="비용" stroke="#4f46e5" fill="url(#gCost)" strokeWidth={3} dot={{ fill:"#4f46e5", r:4, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r:6 }} />
                    <Area type="monotone" dataKey="매출" stroke="#06b6d4" fill="url(#gRevenue)" strokeWidth={3} dot={{ fill:"#06b6d4", r:4, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r:6 }} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-8 mt-4">
                  {[{c:"#4f46e5",l:"광고비 총액"},{c:"#06b6d4",l:"전환 매출액"}].map(x => (
                    <div key={x.l} className="flex items-center gap-2 text-xs font-bold text-gray-600">
                      <div style={{ width:12, height:12, background:x.c, borderRadius:2 }} />{x.l}
                    </div>
                  ))}
                </div>
              </div>

              {/* 전환수 + ROAS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <SectionTitle sub="월별 총 전환 획득 건수 변화">전환 수 트렌드</SectionTitle>
                  <ResponsiveContainer minWidth={0} width="100%" height={260}>
                    <BarChart data={trendData} barSize={36} margin={{ top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fill:"#6b7280", fontSize:12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f9fafb' }} content={<CustomTooltip />} />
                      <Bar dataKey="전환" fill="#8b5cf6" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <SectionTitle sub="광고 지출 대비 매출 효율 변화 퍼센트">ROAS 변화 트렌드 (%)</SectionTitle>
                  <ResponsiveContainer minWidth={0} width="100%" height={260}>
                    <LineChart data={trendData} margin={{ top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fill:"#6b7280", fontSize:12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={false} tickLine={false} domain={["auto","auto"]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="ROAS" stroke="#f59e0b" strokeWidth={3} dot={{ fill:"#f59e0b", r:5, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r:7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 6개월 요약 테이블 */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                  <SectionTitle sub="기간별 메트릭 비교표 (클릭시 해당 월로 요약 이동)">최근 6개월 월별 성과 데이터 추이</SectionTitle>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                      <tr>
                        {["월","노출","클릭","광고비","전환","매출","CTR","ROAS"].map((h, i) => (
                          <th key={h} className={`px-6 py-4 uppercase text-xs tracking-wider ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {MONTHS.slice(-6).reverse().map((m) => {
                        const d = monthlyData[m];
                        const isSelected = m === selectedMonth;
                        return (
                          <tr key={m} 
                            onClick={() => { setSelectedMonth(m); setActiveTab("overview"); }}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-blue-50/50 hover:bg-blue-50" : "hover:bg-gray-50"
                            }`} 
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {isSelected && <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
                                <span className={`font-medium ${isSelected ? "text-blue-700 font-bold" : "text-gray-700"}`}>{fmtLabel(m)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600">{fmt(d.impressions)}</td>
                            <td className="px-6 py-4 text-right text-gray-600">{fmt(d.clicks)}</td>
                            <td className="px-6 py-4 text-right font-bold text-gray-800">{fmtKRW(d.cost)}</td>
                            <td className="px-6 py-4 text-right font-medium text-gray-700">{d.conversions.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-bold text-teal-600">{fmtKRW(d.revenue)}</td>
                            <td className="px-6 py-4 text-right text-gray-600">{d.ctr}%</td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">{d.roas}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          {/* ===== 탭 2: 채널별 분석 ===== */}
          <div ref={platformRef} className={`${(activeTab === "platform" || isExporting) ? "block" : "hidden"} ${!isExporting ? 'animate-fade-in-up' : ''} space-y-6 ${isExporting ? 'mb-24 page-break-after' : ''}`}>

              {/* [2026-03-13] 채널별 KPI 카드 - 기존 4열 스타일 유지 + 개별 AI 진단 블록 추가 */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {(Object.entries(cur.platforms) as [string, { spend: number; impressions: number; clicks: number; conversions: number }][]).map(([k, v]) => (
                  <div key={k} className="bg-white border rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition" style={{ borderColor: `${PLATFORM_COLORS[k]}33` }}>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" style={{ background: `linear-gradient(135deg, ${PLATFORM_COLORS[k]} 0%, transparent 60%)` }} />
                    <div className="flex items-center gap-2 mb-4">
                      <div style={{ width:12, height:12, borderRadius:"50%", background:PLATFORM_COLORS[k] }} />
                      <span className="text-base font-bold text-gray-900">{PLATFORM_LABELS[k]}</span>
                    </div>

                    <div className="space-y-3">
                      {[
                        {l:"광고비", v:fmtKRW(v.spend)},
                        {l:"노출수", v:fmt(v.impressions)},
                        {l:"클릭수", v:fmt(v.clicks)},
                        {l:"전환수", v:`${v.conversions.toLocaleString()}건`},
                      ].map(item => (
                        <div key={item.l} className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-gray-500">{item.l}</span>
                          <span className="text-sm font-bold text-gray-800">{item.v}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400">전체 대비 예산 비중</span>
                        <span className="text-base font-extrabold" style={{ color:PLATFORM_COLORS[k] }}>
                          {Math.round(v.spend / cur.cost * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* 채널별 개별 AI 진단 */}
                    {(isPro || insights?.channels?.[k]) ? (
                      <div className="mt-4 bg-indigo-50/40 border border-dashed border-indigo-400/60 rounded-xl p-4 relative print:hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l-xl opacity-60" />
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="p-0.5 px-2 bg-indigo-500 text-white rounded flex items-center gap-1 shadow-sm">
                            <Sparkles size={10} />
                            <span className="text-[9px] font-black uppercase tracking-wider">AI {PLATFORM_LABELS[k]} 진단</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-700 leading-relaxed font-medium">
                          {isLlmLoading ? (
                            <div className="space-y-1.5">
                              <div className="h-3 bg-indigo-100/50 animate-pulse rounded w-full" />
                              <div className="h-3 bg-indigo-100/50 animate-pulse rounded w-4/5" />
                            </div>
                          ) : (
                            insights?.channels?.[k] || "⚠️ 상단 'AI 분석 갱신' 버튼을 클릭해주세요."
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="print:hidden mt-4 flex items-center gap-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-3 text-[11px] text-gray-400">
                        <Sparkles size={12} className="text-indigo-300 shrink-0" />
                        <span>PRO 전용 AI 진단</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 채널별 광고비 & 전환수 바 차트 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <SectionTitle sub="플랫폼별 예산 집행 현황">광고비 분포</SectionTitle>
                  <ResponsiveContainer minWidth={0} width="100%" height={260}>
                    <BarChart data={platformBar} barSize={40} margin={{ top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fill:"#6b7280", fontSize:12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v,"원")} />
                      <Tooltip cursor={{ fill: '#f9fafb' }} content={<CustomTooltip />} />
                      <Bar dataKey="광고비" radius={[6,6,0,0]}>
                        {platformBar.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <SectionTitle sub="플랫폼별 실제 전환 획득 현황">전환 수 분포</SectionTitle>
                  <ResponsiveContainer minWidth={0} width="100%" height={260}>
                    <BarChart data={platformBar} barSize={40} margin={{ top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fill:"#6b7280", fontSize:12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f9fafb' }} content={<CustomTooltip />} />
                      <Bar dataKey="전환" radius={[6,6,0,0]}>
                        {platformBar.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 채널 상세 비교 테이블 */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <SectionTitle sub="플랫폼별 세부 지표 및 성과 데이터">채널별 상세 비교</SectionTitle>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                      <tr>
                        {["채널","광고비","노출수","클릭수","전환수","CTR","CPC","예산 비중"].map((h, i) => (
                          <th key={h} className={`px-6 py-4 uppercase text-xs tracking-wider ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(cur.platforms).map(([k, v]: any) => {
                        const ctr = v.clicks > 0 ? (v.clicks / v.impressions * 100).toFixed(2) : "0.00";
                        const cpc = v.clicks > 0 ? Math.round(v.spend / v.clicks) : 0;
                        const ratio = Math.round(v.spend / cur.cost * 100);
                        return (
                          <tr key={k} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div style={{ width:10, height:10, borderRadius:"50%", background:PLATFORM_COLORS[k] }} />
                                <span className="font-bold text-gray-900">{PLATFORM_LABELS[k]}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-800">{fmtKRW(v.spend)}</td>
                            <td className="px-6 py-4 text-right text-gray-600">{fmt(v.impressions)}</td>
                            <td className="px-6 py-4 text-right text-gray-600">{fmt(v.clicks)}</td>
                            <td className="px-6 py-4 text-right font-semibold text-blue-600">{v.conversions.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-gray-600 font-medium">{ctr}%</td>
                            <td className="px-6 py-4 text-right text-gray-600">₩{cpc.toLocaleString()}</td>
                            <td className="px-6 py-4 w-48">
                              <div className="flex items-center justify-end gap-3">
                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div style={{ width: `${ratio}%`, background: PLATFORM_COLORS[k] }} className="h-full rounded-full" />
                                </div>
                                <span className="font-bold text-sm w-8 text-right" style={{ color: PLATFORM_COLORS[k] }}>{ratio}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>

          {/* [2026-03-12 16:02] 수정 이유: 인사이트 페이지 양식에 맞춘 캠페인 성과 탭 구현
              상세 설명: 캠페인별 광고 성과를 채널, 비용, 노출, 클릭, 전환, ROAS 지표로 세분화하여 리포팅함. */}
          <div ref={campaignRef} className={`${(activeTab === "campaign" || isExporting) ? "block" : "hidden"} ${!isExporting ? 'animate-fade-in-up' : ''} space-y-6 ${isExporting ? 'mb-24 page-break-after' : ''}`}>

            {campaigns.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 shadow-sm text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-500 font-medium">선택한 월에 캠페인 데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                {/* [2026-03-12 16:02] 수정 이유: 가독성 강화를 위한 수직 리스트(Row) 레이아웃 변경
                    상세 설명: 기존 그리드 방식에서 가로형 리스트 방식으로 변경하여 긴 캠페인명을 수용하고 지표 비교를 용이하게 함. */}
                <div className="flex flex-col gap-4">
                  {campaigns.slice(0, 4).map((c: any, idx: number) => {
                    const pColor = PLATFORM_COLORS[c.platform] || '#6b7280';
                    return (
                      <div 
                        key={c.campaign_id} 
                        className="bg-white border rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition flex flex-col gap-6" 
                        style={{ borderColor: `${pColor}33` }}
                      >
                        {/* 배경 그라데이션 효과 (가로 방향) */}
                        <div className="absolute top-0 left-0 right-0 h-24 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" style={{ background: `linear-gradient(90deg, ${pColor} 0%, transparent 40%)` }} />
                        
                        {/* 1. 상단 성과 및 플랫폼 정보 */}
                        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                          <div className="flex items-center gap-5 min-w-[240px]">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg" style={{ background: pColor }}>
                              {idx + 1}
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase" style={{ background: pColor }}>
                                  {PLATFORM_LABELS[c.platform] || c.platform}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {c.status === 'active' ? '● ACTIVE' : '○ PAUSED'}
                                </span>
                              </div>
                              <p className="text-base font-bold text-gray-900 truncate max-w-[360px]" title={c.campaign_name}>
                                {c.campaign_name}
                              </p>
                            </div>
                          </div>

                          {/* 2. 주요 지표 데이터 (가로 배치) */}
                          <div className="flex-grow grid grid-cols-2 lg:grid-cols-4 gap-6 w-full py-2">
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">광고비</p>
                              <p className="text-base font-black text-gray-800">{fmtKRW(c.cost)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">노출 / 클릭</p>
                              <p className="text-sm font-bold text-gray-700">{fmt(c.impressions)} / <span className="text-blue-500">{fmt(c.clicks)}</span></p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">전환수</p>
                              <p className="text-base font-black text-indigo-600">{c.conversions.toLocaleString()}건</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-wider">ROAS 효율</p>
                              <p className={`text-base font-black ${
                                c.roas >= 300 ? 'text-green-600' : c.roas >= 100 ? 'text-amber-500' : 'text-red-500'
                              }`}>
                                {c.roas}%
                              </p>
                            </div>
                          </div>

                          {/* 3. 예산 비중 바 (우측 배치) */}
                          <div className="min-w-[140px] w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] text-gray-400 font-black">집행 비중</span>
                              <span className="text-xs font-black" style={{ color: pColor }}>
                                {cur.cost > 0 ? Math.round(c.cost / cur.cost * 100) : 0}%
                              </span>
                            </div>
                            <div className="w-full md:w-24 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                              <div 
                                style={{ width: `${cur.cost > 0 ? Math.round(c.cost / cur.cost * 100) : 0}%`, background: pColor }} 
                                className="h-full rounded-full transition-all duration-700 ease-out" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* 4. AI 인공지능 캠페인 진단 리포트 (하단 배치) */}
                        {isPro ? (
                          <div className="bg-indigo-50/40 border-2 border-dashed border-indigo-500/50 rounded-xl p-5 mt-2 relative">
                            <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-sm z-20 animate-pulse"> AI 분석</div>
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l-xl opacity-70" />
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1 px-2 bg-indigo-500 text-white rounded-md flex items-center gap-1.5 shadow-sm">
                                <Sparkles size={12} />
                                <span className="text-[10px] font-black uppercase tracking-wider">AI 인공지능 캠페인 진단 리포트</span>
                              </div>
                            </div>
                            <div className="text-[12px] text-gray-700 leading-relaxed font-medium">
                              {isLlmLoading ? (
                                <div className="space-y-2">
                                  <div className="h-3 bg-indigo-100/50 animate-pulse rounded w-full" />
                                  <div className="h-3 bg-indigo-100/50 animate-pulse rounded w-5/6" />
                                </div>
                              ) : (
                                insights?.campaigns?.[c.campaign_id] || "⚠️ 해당 캠페인의 상세 분석 데이터가 없습니다. 상단 AI 분석 버튼을 클릭하여 생성해주세요."
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="print:hidden mt-2 flex items-center gap-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-3 text-[11px] text-gray-400">
                            <Sparkles size={12} className="text-indigo-300 shrink-0" />
                            <span>AI 캠페인 진단은 <button onClick={() => navigate('/payment')} className="text-indigo-500 font-bold hover:underline">PRO 요금제</button>에서만 이용할 수 있습니다.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 캠페인별 광고비 바 차트 (상위 8개) */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <SectionTitle sub="캠페인별 광고 예산 집행 현황 (광고비 상위 8개)">캠페인 광고비 분포</SectionTitle>
                  <ResponsiveContainer minWidth={0} width="100%" height={280}>
                    <BarChart
                      data={campaigns.slice(0, 8).map((c: any) => ({
                        name: c.campaign_name.length > 20 ? c.campaign_name.slice(0, 20) + '…' : c.campaign_name,
                        광고비: c.cost,
                        ROAS: c.roas,
                        color: PLATFORM_COLORS[c.platform] || '#6b7280',
                      }))}
                      barSize={36}
                      margin={{ top: 20, right: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v, '원')} />
                      <Tooltip cursor={{ fill: '#f9fafb' }} content={<CustomTooltip />} />
                      <Bar dataKey="광고비" radius={[6, 6, 0, 0]}>
                        {campaigns.slice(0, 8).map((c: any, i: number) => (
                          <Cell key={i} fill={PLATFORM_COLORS[c.platform] || '#6b7280'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 캠페인 상세 테이블 - 별도 ref로 분리하여 PDF 페이지 경계에서 잘림 방지 */}
                <div ref={campaignTableRef} className={`${(activeTab === "campaign" || isExporting) ? "block" : "hidden"} space-y-0`}>
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <SectionTitle sub="전체 캠페인 상세 성과 지표 (헤더 클릭 시 정렬)">캠페인별 상세 성과</SectionTitle>
                    <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full font-medium">총 {campaigns.length}개 캠페인</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                        <tr>
                          {([
                            { key: 'campaign_name', label: '캠페인명' },
                            { key: 'platform',      label: '채널' },
                            { key: 'status',        label: '상태' },
                            { key: 'cost',          label: '광고비' },
                            { key: 'impressions',   label: '노출수' },
                            { key: 'clicks',        label: '클릭수' },
                            { key: 'ctr',           label: 'CTR' },
                            { key: 'conversions',   label: '전환수' },
                            { key: 'cpc',           label: 'CPC' },
                            { key: 'roas',          label: 'ROAS' },
                          ] as const).map(({ key, label }, i) => (
                            <th
                              key={key}
                              onClick={() => setCampaignSort(prev => ({ key, asc: prev.key === key ? !prev.asc : false }))}
                              className={`px-4 py-4 text-xs tracking-wider uppercase cursor-pointer select-none hover:text-blue-600 transition-colors ${
                                i > 2 ? 'text-right' : ''
                              }`}
                            >
                              {label}
                              {campaignSort.key === key && (
                                <span className="ml-1">{campaignSort.asc ? '▲' : '▼'}</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {campaigns.map((c: any) => {
                          const pColor = PLATFORM_COLORS[c.platform] || '#6b7280';
                          return (
                            <tr key={c.campaign_id} className="hover:bg-gray-50/60 transition-colors">
                              {/* 캠페인명 */}
                              <td className="px-4 py-4 max-w-[360px]">
                                <p className="font-semibold text-gray-800 truncate" title={c.campaign_name}>{c.campaign_name}</p>
                              </td>
                              {/* 채널 뱃지 */}
                              <td className="px-4 py-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: pColor }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
                                  {PLATFORM_LABELS[c.platform] || c.platform}
                                </span>
                              </td>
                              {/* 상태 */}
                              <td className="px-4 py-4">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  c.status === 'active'  ? 'bg-green-100 text-green-700' :
                                  c.status === 'paused'  ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {c.status === 'active' ? '● 진행중' : c.status === 'paused' ? '⏸ 일시정지' : c.status}
                                </span>
                              </td>
                              {/* 광고비 */}
                              <td className="px-4 py-4 text-right font-bold text-gray-900">{fmtKRW(c.cost)}</td>
                              {/* 노출 */}
                              <td className="px-4 py-4 text-right text-gray-600">{fmt(c.impressions)}</td>
                              {/* 클릭 */}
                              <td className="px-4 py-4 text-right text-gray-600">{fmt(c.clicks)}</td>
                              {/* CTR */}
                              <td className="px-4 py-4 text-right text-gray-600">{c.ctr}%</td>
                              {/* 전환 */}
                              <td className="px-4 py-4 text-right font-semibold text-blue-600">{c.conversions.toLocaleString()}</td>
                              {/* CPC */}
                              <td className="px-4 py-4 text-right text-gray-600">₩{c.cpc.toLocaleString()}</td>
                              {/* ROAS */}
                              <td className="px-4 py-4 text-right">
                                <span className={`font-bold px-2 py-0.5 rounded-md text-sm ${
                                  c.roas >= 300 ? 'bg-green-50 text-green-600' :
                                  c.roas >= 100 ? 'bg-amber-50 text-amber-600' :
                                  'bg-red-50 text-red-500'
                                }`}>{c.roas}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to { opacity:1; transform:translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeUp 0.4s ease-out forwards;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  );
}
