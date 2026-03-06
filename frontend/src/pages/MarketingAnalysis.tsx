import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { useQuery } from '@tanstack/react-query'; // 데이터 가져오는 훅
import { dashboardAPI, api } from '@/lib/api';
// import './App.css'; // 필요하다면 주석 해제
import { useAuthStore } from '@/store/authStore';

const BG_COLOR = '#F4F7FC';

// ─── [Type 정의] 데이터들의 모양을 미리 정해줍니다 ───
interface HistoryItem {
  day: string;
  Naver: number;
  Meta: number;
  Google: number;
  Karrot: number;
}

interface FeatureItem {
  채널명_Naver?: number;
  채널명_Meta?: number;
  채널명_Google?: number;
  채널명_Karrot?: number;
  비용: number;
  ROAS: number;
  trend_score: number;
}

interface AnalysisResult {
  allocated_budget: number[];
  predicted_roas: number[];
  expected_revenue: number;
  history: HistoryItem[];
  ai_report: string;
}

function MarketingAnalysis() {
  // state 타입 정의
  const [budget, setBudget] = useState<number | string>('');
  const [period, setPeriod] = useState<number>(7);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  // 꺾은선 그래프 하이라이팅 - 마우스가 어디 선에 올라가있었는지 기억하는 공간
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  // 예산 상한선 경고 띄울 상태
  const [budgetWarning, setBudgetWarning] = useState<boolean>(false);
  // 로그인한 내 정보 꺼내기
  const user = useAuthStore((state) => state.user);

  
  // 숫자에만 반응하고 콤마를 찍어주는 함수
  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, ''); // 숫자만 추출
    
    // 다 지워서 빈칸이 되었을 때의 처리
    if (!rawValue) {
      setBudget('');
      setBudgetWarning(false); // 경고문도 같이 끕니다
      return;
    }

    let numValue = Number(rawValue);
    
    // 200만 원 상한선 방어 로직
    if (numValue > 2000000) {
      numValue = 2000000; // 강제로 200만 원으로 깎음
      setBudgetWarning(true); // 빨간 경고문 켜기
    } else {
      setBudgetWarning(false); // 정상 범위면 경고문 끄기
    }

    setBudget(numValue.toLocaleString()); // 콤마 붙여서 상태 업데이트
  };

  // 1번 엔진 : AI분석을 위한 실시간 채널 데이터(Input 재료)
  const { data: dbData} = useQuery({
    queryKey: ['ai-analysis-data'], // 고유한 이름표
    queryFn: () => dashboardAPI.getChannelPerformance(), // 대시보드와 같은 API 호출
  }); 

  // 2번 엔진 : 유저의 과거 분석 히스토리(output 결과)
 const { data: historyList, refetch: refetchHistory } = useQuery({
    queryKey: ['ai-history', user?.id],                   // 유저가 바뀌면 이 데이터도 바뀜
    queryFn: () => dashboardAPI.getAiHistory(Number(user?.id)),
    enabled: !!user?.id,                                  // 로그인했을 때만 작동하는 안전장치
  });



  useEffect(() => {
    setMounted(true);
  }, []);

  // API 요청 함수
  const getRecommendation = async (periodOverride?: number) => {

    // ✅ [추가] 사용자가 예산을 안 적고 버튼을 눌렀을 때 튕겨내는 방어막
    const cleanBudget = Number(budget.toString().replace(/,/g, ''));
    if (cleanBudget <= 0) {
      alert("최적화할 하루 광고비(예산)를 먼저 입력해주세요! 💸");
      return; // 여기서 멈추고 서버로 넘어가지 않음
    }

    console.log("[사용자 로그] '분석 실행'버튼 클릭");
    setLoading(true);

    const currentDuration = typeof periodOverride === 'number' ? periodOverride : period;

    try {
      const days = currentDuration;
      const dailyData: HistoryItem[] = [];

      for (let i = days; i > 0; i--){
        const trend = 1.0 - (i * 0.01);
        dailyData.push({
          day: `${i}일차`,
          Naver: Math.floor((350 + Math.random() * 50) * trend),
          Meta: Math.floor((220 + Math.random() * 50) * trend),
          Google: Math.floor((280 + Math.random() * 50) * trend),
          Karrot: Math.floor((300 + Math.random() * 50) * trend),
        });
      }

      let features: FeatureItem[] = [];
      const trendScore = currentDuration === 7 ? 90 : 50;
      
      // ★ [수정] 무조건 4개 채널을 고정적으로 생성 (없으면 0으로 채움)
      const targetPlatforms = ['naver', 'meta', 'google', 'karrot'];
      
      // DB 데이터(realPerformance)가 없으면 빈 배열로 처리
      const dbList = dbData?.data?.performance || [];
      
      console.log("🔥 DB 원본 데이터:", dbList);

      features = targetPlatforms.map(pName => {

        // 1. [핵심] find(1개만 찾기) 대신 filter(모두 찾기)를 사용합니다.
        const matchedItems = dbList.filter((item: any) => 
          item.platform.toLowerCase().includes(pName)
        );
        
        // 2. 비용(Cost)은 찾은 데이터들의 값을 모두 더합니다 (합산)
        const totalCost = matchedItems.reduce((sum: number, item: any) => 
          sum + (item.metrics?.cost || 0), 0
        );
        
        // 3. ROAS는 합치면 수익률이 뻥튀기되므로 '평균'을 냅니다
        const avgRoas = matchedItems.length > 0 
          ? matchedItems.reduce((sum: number, item: any) => sum + (item.metrics?.roas || 0), 0) / matchedItems.length
          : 0;
        
        return {
          "채널명_Naver": pName === 'naver' ? 1 : 0,
          "채널명_Meta": pName === 'meta' ? 1 : 0,
          "채널명_Google": pName === 'google' ? 1 : 0,
          "채널명_Karrot": pName === 'karrot' ? 1 : 0, 
          
          "비용": Number(totalCost),
          "ROAS": Number(avgRoas),
          "trend_score": trendScore
        };
      });
      
      console.log("✅ AI로 보내는 최종 데이터 :", features);

      // 백엔드 요청
      const cleanBudget = Number(budget.toString().replace(/,/g, ''));
      
      console.log("🚀 [보안 검문] 현재 로그인의 주인공 ID:", user?.id);

      // 통합된 Node.js API 서버로 향하도록 설정
      const response = await api.post(`/ai/recommend`, {
        user_id : user?.id, // user_id 추가
        total_budget: cleanBudget,
        features: features,
        history_data : dailyData,
        duration : currentDuration
      });

      setResult(response.data);

      // 히스토리 목록 다시 불러오기
      setTimeout(() => refetchHistory(), 500);

    } catch (error) {
      console.error(error);
      alert("서버 연결 실패! (백엔드를 실행해주세요)");
    }
    setLoading(false);
  };

  // ✅ [추가] 과거 리포트 불러오기 함수 (여기에 쏙 들어갑니다)
  const handleLoadHistory = async (historyId: number) => {
    setLoading(true); 
    try {
      const reportData = await dashboardAPI.getAiReportDetail(historyId);
      
      // DB에서 넘어온 데이터 파싱 (문자열이면 객체로, 객체면 그대로)
      const parsedData = typeof reportData === 'string' ? JSON.parse(reportData) : reportData;
      
      // 기존 화면의 그래프와 리포트 데이터를 옛날 데이터로 싹 덮어씌웁니다!
      setResult(parsedData);
      
      // 스크롤을 맨 위로 부드럽게 올려서 결과 화면을 바로 보게 해줍니다.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      alert("과거 리포트를 불러오는 데 실패했습니다.");
    }
    setLoading(false);
  };
  // ─────────────────────────────────────────────────────────


  const handlePeriodChange = (newPeriod: number) => {
    setPeriod(newPeriod);
    getRecommendation(newPeriod);
  };

  
  // 차트 데이터 가공
  const pieData = result ? [
    { name: '네이버', value: result.allocated_budget[0], color: '#2DB400' },
    { name: '메타', value: result.allocated_budget[1], color: '#1877F2' },
    { name: '구글', value: result.allocated_budget[2], color: '#EA4335' },
    { name: '당근', value: result.allocated_budget[3], color: '#FF6F0F' }
  ].filter(item => item.value > 0) : []; // 0원인 항목은 차트에서 제외

  const barData = result ? [
    { name: '네이버', roas: result.predicted_roas[0], color: '#2DB400' },
    { name: '메타', roas: result.predicted_roas[1], color: '#1877F2' },
    { name: '구글', roas: result.predicted_roas[2], color: '#EA4335' },
    { name: '당근', roas: result.predicted_roas[3], color: '#FF6F0F' }
  ] : [];
  
  // DB 데이터(realPerformance)가 없으면 빈 배열로 처리
  const dbList = dbData?.data?.performance || [];
  const totalInputCost = dbList.reduce((acc: number, cur: any) => acc + (cur.metrics?.cost || 0), 0);

  // rows에서 데이터만 가져오기
  const safeHistoryList = historyList?.rows ? historyList.rows : (Array.isArray(historyList) ? historyList : []);

  return (
    <div style={{ backgroundColor: BG_COLOR, minHeight: '100vh', padding: '40px 20px', fontFamily: '"Pretendard", sans-serif' }}>
      
      {/* 1. 헤더 및 입력 섹션 */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '30px' }}>
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          
          <div style={{ 
            display: 'inline-block', 
            backgroundColor: '#dfecfa', 
            color: '#03458c', 
            padding: '6px 15px', 
            borderRadius: '20px', 
            fontSize: '1.2rem', 
            fontWeight: 'bold', 
            marginBottom: '15px',
            border: '1px solid #d9e6f5'
          }}>
            ✅ 4개 채널 데이터 연동 완료
          </div>

          <h1 style={{ 
            color: '#2D3436', fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px', letterSpacing: '-1px' 
          }}>
            📢 사장님을 위한 AI 광고 예산 비서
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#636e72' }}>
            복잡한 데이터 분석은 AI에게 맡기고, <strong style={{ color: '#0984e3' }}>가장 효과 좋은 곳</strong>에만 돈을 쓰세요!
          </p>
        </header>

        {/* 상단 입력 바 */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px 40px', 
          borderRadius: '20px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          border: '1px solid #f1f3f5'
        }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2D3436' }}>
            하루 광고비, 얼마를 최적화할까요?
          </span>
          
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
               <input
                type="text" 
                value={budget}
                onChange={handleBudgetChange}
                placeholder="예: 500,000"
                style={{ 
                  width: '220px', 
                  padding: '14px 40px 14px 20px', 
                  fontSize: '1.3rem', 
                  fontWeight: 'bold',
                  color: '#2D3436',
                  borderRadius: '12px', 
                  border: budgetWarning ? '2px solid #ff6b6b' : '2px solid #dfe6e9', // 경고 시 테두리도 빨갛게!
                  outline: 'none',
                  textAlign: 'right',
                  backgroundColor: '#fdfdfd',
                  transition: 'border-color 0.3s'
                }}
              />
              <span style={{ position: 'absolute', right: '15px', fontWeight: 'bold', color: '#b2bec3', fontSize: '1rem' }}>원</span>
            </div>
            
            {/* 💡 200만 원 초과 시 나타나는 친절한 경고문 (레이아웃 파괴를 막기 위해 absolute 적용) */}
            {budgetWarning && (
              <div style={{ position: 'absolute', top: '100%', left: '5px', color: '#ff6b6b', fontSize: '0.85rem', marginTop: '8px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                ※ 최대 2,000,000원까지만 분석할 수 있습니다.
              </div>
            )}
          </div>

          {/* 프리미엄 버튼 */}
          <button
            onClick={() => getRecommendation()}
            disabled={loading}
            style={{ 
              padding: '14px 35px', 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              backgroundColor: '#2d3436cd', 
              color: '#e9c704', 
              border: '1px solid #2d3436cd', 
              borderRadius: '12px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px', 
              boxShadow: '0 4px 15px rgba(233, 199, 4, 0.15)', 
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.backgroundColor = '#2d3436';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(233, 199, 4, 0.3)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.backgroundColor = '#2d3436cd';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(233, 199, 4, 0.15)';
            }}
          >
            {loading ? (
               <span style={{ color: '#b2bec3' }}>AI 분석 중... ⏳</span>
            ) : (
               <>
                 <span style={{ fontSize: '1.3rem' }}> 프리미엄 분석 실행</span> 
               </>
            )}
          </button>
        </div>
      </div>

      {/* 2. 하단 결과 대시보드 영역 */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {result ? (
          // ▼ 내 입력 데이터가 1원이라도 있니?
          totalInputCost>0 ? (
            
            /* ─── CASE A: 데이터가 있어서 그래프를 보여주는 화면 ─── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

              {/* 핵심 지표 (KPI Cards) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 5px 20px rgba(0,0,0,0.03)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1rem', color: '#888', fontWeight: 'bold' }}>💰 예측 총 매출액</span>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#2D3436', marginTop: '10px', letterSpacing: '-1px' }}>
                    {Math.round(result.expected_revenue).toLocaleString()}원
                  </div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 5px 20px rgba(0,0,0,0.03)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1rem', color: '#888', fontWeight: 'bold' }}>🏆 베스트 전략</span>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0984e3', marginTop: '10px', letterSpacing: '-1px' }}>
                    {barData.length > 0 ? barData.reduce((prev, current) => (prev.roas > current.roas) ? prev : current).name : '-'} 집중 공략
                  </div>
                </div>
              </div>

              {/* ★ [복구됨] 꺾은선 그래프를 감싸는 하얀색 배경 박스 시작 */}
              <div style={{ backgroundColor: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginTop: '20px' }}>
                
                {/* 꺾은선 그래프 상단 타이틀 영역 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  {/* 왼쪽: 제목과 버튼 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h3 style={{ fontSize: '1.3rem', margin: 0, color: '#333' }}>📉 AI 매체별 성과 예측 시뮬레이션</h3>
                    <div style={{ display: 'flex', backgroundColor: '#f1f3f5', borderRadius: '20px', padding: '4px' }}>
                      <button 
                        onClick={() => handlePeriodChange(7)}
                        style={{
                          padding: '5px 15px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
                          backgroundColor: period === 7 ? 'white' : 'transparent',
                          color: period === 7 ? '#2D3436' : '#868e96',
                          boxShadow: period === 7 ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        7일 시뮬레이션
                      </button>
                      <button 
                        onClick={() => handlePeriodChange(30)}
                        style={{
                          padding: '5px 15px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
                          backgroundColor: period === 30 ? 'white' : 'transparent',
                          color: period === 30 ? '#2D3436' : '#868e96',
                          boxShadow: period === 30 ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        30일 시뮬레이션
                      </button>
                    </div>
                  </div>
                  
                  {/* 오른쪽 텅 빈 공간에 뱃지 형태로 Tip */}
                  <div style={{ fontSize: '0.85rem', color: '#0984e3', backgroundColor: '#e3f2fd', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold' }}>
                    💡 Tip. 선이나 매체명에 마우스를 올려보세요!
                  </div>
                </div>

                <div style={{ width: '100%', height: 320, position: 'relative' }}>
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10} debounce={50}>
                      <LineChart data={result.history} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                        <Legend 
                          iconType="circle" 
                          wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }}
                          onMouseEnter={(e: any) => setHoveredLine(e.dataKey as string)}
                          onMouseLeave={() => setHoveredLine(null)}
                        />
                        <Line type="monotone" dataKey="Naver" name="네이버" stroke="#2DB400" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} strokeOpacity={hoveredLine && hoveredLine !== 'Naver' ? 0.15 : 1} />
                        <Line type="monotone" dataKey="Meta" name="메타" stroke="#1877F2" strokeWidth={3} dot={{ r: 4 }} strokeOpacity={hoveredLine && hoveredLine !== 'Meta' ? 0.15 : 1} />
                        <Line type="monotone" dataKey="Google" name="구글" stroke="#EA4335" strokeWidth={3} dot={{ r: 4 }} strokeOpacity={hoveredLine && hoveredLine !== 'Google' ? 0.15 : 1} />
                        <Line type="monotone" dataKey="Karrot" name="당근" stroke="#FF6F0F" strokeWidth={3} dot={{ r: 4 }} strokeOpacity={hoveredLine && hoveredLine !== 'Karrot' ? 0.15 : 1} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
                
                <div style={{ textAlign: 'right', marginTop: '5px', paddingRight: '15px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#7c7c7c' }}>
                    * 본 그래프는 현재 시장 트렌드를 반영하여 AI가 가상으로 시뮬레이션한 예측 흐름입니다.
                  </span>
                </div>

              </div> 

              {/* 예산 비중 & 매체 효율 */}
              <div style={{ 
                backgroundColor: 'white', 
                padding: '35px', 
                borderRadius: '20px', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '50px'
              }}>
                  {/* 파이 차트 */}
                  <div style={{ textAlign: 'center', minWidth:0, overflow: 'hidden'}}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#333' }}>💰 채널별 예산 추천 비율</h3>
                    <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                      {mounted && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10} debounce={50}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={110}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => `${value.toLocaleString()}원`} contentStyle={{ borderRadius: '10px', border: 'none' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )} 
                    </div>
                  </div>

                  {/* 막대 차트 */}
                  <div style={{ borderLeft: '1px solid #f1f3f5', paddingLeft: '50px', minWidth:0, overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#333' }}>📈 매체별 예측 효율 (ROAS)</h3>
                    <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                      {mounted && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10} debounce={50}>
                          <BarChart data={barData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#f1f3f5" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 13, fontWeight: 'bold', fill: '#555' }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(value: any) => [`${value}%`, '예측 ROAS']} cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: '10px', border: 'none' }} />
                            <Bar dataKey="roas" barSize={30} radius={[0, 10, 10, 0]}>
                              <LabelList dataKey="roas" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: '13px', fontWeight: 'bold', fill: '#333' }} />
                              {barData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
              </div>

              {/* AI 리포트 */}
              <div style={{
                backgroundColor: '#F8F9FA',
                border: '1px solid #E9ECEF',
                borderLeft: '8px solid #2D3436',
                padding: '40px',
                borderRadius: '16px',
                marginTop: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px' }}>
                  <span style={{ fontSize: '2rem', marginRight: '15px' }}>👩🏻‍🏫</span>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#2D3436', margin: 0 }}>
                    AI 마케팅 컨설팅 리포트
                  </h3>
                </div>

                <div style={{
                  fontSize: '1.25rem',
                  lineHeight: '1.8',
                  color: '#495057',
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"Pretendard", sans-serif'
                }}>
                  {result.ai_report ? (
                    result.ai_report.split('\n').map((line, index) => {
                      
                      // 1. [핵심 요약] 🎯 기호가 있는 줄: 제목은 독립된 줄로, 내용은 그 아래로!
                      if (line.includes('🎯')) {
                        const parts = line.split(':');
                        const titlePart = parts[0]; // 콜론(:)을 빼버려서 더 깔끔한 대제목으로 만듭니다.
                        const descPart = parts.slice(1).join(':').trim(); // 앞의 불필요한 공백 제거

                        return (
                          <div key={index} style={{ marginTop: index > 0 ? '45px' : '0', marginBottom: '15px', lineHeight: '1.6' }}>
                            {/* ✅ 대제목 영역 (한 줄을 혼자 다 쓰도록 div 적용, 아래 여백 추가) */}
                            <div style={{ fontWeight: '900', fontSize: '1.4rem', color: '#2D3436', marginBottom: '10px' }}>
                              {titlePart}
                            </div>
                            
                            {/* ✅ 상세 내용 영역 (제목 밑으로 자연스럽게 떨어짐) */}
                            <div style={{ fontSize: '1.2rem', color: '#636e72', paddingLeft: '35px' }}>
                              {descPart.split('**').map((part, i) => 
                                i % 2 === 1 ? <span key={i} style={{ fontWeight: 'bold', color: '#2D3436' }}>{part}</span> : part
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // 2. [소제목들] 📢, ✅, 🔍 기호가 있는 줄: 크고 굵게 (회색 선 삭제 완료)
                      else if (line.includes('📢') || line.includes('✅') || line.includes('🔍')) {
                        return (
                          <div key={index} style={{ 
                            fontWeight: '900', 
                            fontSize: '1.4rem', 
                            color: '#2D3436', 
                            marginTop: index > 0 ? '45px' : '0', 
                            marginBottom: '15px'
                          }}>
                            {line}
                          </div>
                        );
                      }
                      
                      // 3. [매체 이름] • 기호가 있는 줄: ✔ 아이콘으로 바꾸고 노란색 하이라이트
                      else if (line.trim().startsWith('•')) {
                        return (
                          <div key={index} style={{ 
                            paddingLeft: '15px', 
                            marginBottom: '15px', 
                            marginTop: '35px', 
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <span style={{ marginRight: '10px', color: '#0984e3', fontSize: '1.2rem' }}>✔</span>
                            <span style={{ fontSize: '1.15rem' }}>
                              {line.replace('•', '').split('**').map((part, i) => 
                                i % 2 === 1 ? <span key={i} style={{ fontWeight: '900', color: '#2D3436', backgroundColor: '#fff5ce', padding: '2px 6px', borderRadius: '4px' }}>{part}</span> : part
                              )}
                            </span>
                          </div>
                        );
                      }
                      
                      // 4. [일반 설명글] - 기호로 시작하는 데이터 근거 등: 폰트 사이즈 줄이고 ** 적용
                      else {
                        return (
                          <div key={index} style={{ marginBottom: '6px', paddingLeft: '35px', fontSize: '1.2rem', color: '#636e72', lineHeight: '1.6' }}>
                            {line.split('**').map((part, i) => 
                               i % 2 === 1 ? <span key={i} style={{ fontWeight: 'bold', color: '#2D3436' }}>{part}</span> : part
                            )}
                          </div>
                        );
                      }
                      
                    })
                  ) : "분석 중입니다..."}
                </div>

                {/* ★ 가독성과 전문성을 높인 하단 안내 영역 ★ */}
                <div style={{ marginTop: '35px', paddingTop: '25px', borderTop: '1px solid #E9ECEF' }}>
                  <div style={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #dee2e6', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ fontSize: '1.4rem', marginTop: '2px' }}>⚠️</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      
                      {/* 1. 분석 모델 안내 */}
                      <div style={{ fontSize: '0.85rem', color: '#868e96', letterSpacing: '-0.3px' }}>
                        본 분석은 연동된 광고 실시간 데이터를 바탕으로 <strong style={{color: '#495057'}}>XGBoost 예측 모델</strong>과 <strong style={{color: '#495057'}}>선형 계획법 알고리즘</strong>을 통해 산출되었습니다.
                      </div>

                      {/* 2. 법적 면책 조항 (가독성 개선) */}
                      <div style={{ 
                        fontSize: '0.95rem', 
                        color: '#495057', 
                        lineHeight: '1.7', 
                        wordBreak: 'keep-all',
                        borderTop: '1px dashed #eee',
                        paddingTop: '12px'
                      }}>
                        <strong style={{ color: '#2D3436', display: 'block', marginBottom: '4px' }}>[면책 조항 및 분석 한계 안내]</strong>
                        • 위 결과는 AI 모델이 도출한 <strong>'예측값'</strong>이며, 미래의 실제 매출이나 광고 수익률을 보장하지 않습니다.<br />
                        • 시장 상황 및 외부 요인에 따라 실제 결과는 다를 수 있으므로 <strong style={{ color: '#2D3436' }}>참고용 보조 지표</strong>로만 활용하시기 바랍니다.<br />
                        • 최종적인 예산 집행 및 광고 운영에 대한 모든 책임은 사용자에게 있습니다.
                      </div>

                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* ─── CASE B: 연동은 성공했지만 데이터가 0인 경우 (빈 화면) ─── */
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '20px', 
              border: '2px dashed #ced4da', 
              color: '#495057', 
              minHeight: '400px',
              padding: '40px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📭</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>분석할 데이터가 부족합니다</h3>
              <p style={{ fontSize: '1.1rem', color: '#868e96', lineHeight: '1.6' }}>
                DB에 저장된 광고 성과 데이터가 없습니다.<br/>
                <span style={{ fontSize: '1rem' }}>데이터가 쌓이면 AI가 자동으로 예산을 분석해 드립니다.</span>
              </p>
            </div>
          )
        ) : (
          /* ─── CASE C: 아직 분석 버튼을 누르지 않은 초기 화면 ─── */
          // ✅ 1. 부모 박스(<div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>)로 두 영역을 감싸줍니다.
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* 1️⃣ 사장님의 기존 안내 문구 영역 (절대 건드리지 않음) */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: 'white', 
              borderRadius: '20px', 
              border: '2px dashed #e0e0e0', 
              color: '#aaa', 
              minHeight: '400px' 
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.5 }}>📊</div>
              <p style={{ fontSize: '1.3rem', textAlign: 'center', lineHeight: '1.6' }}>
                상단에 예산을 입력하고 <strong>프리미엄 분석 실행</strong> 버튼을 눌러주세요.<br/>
                <span style={{ fontSize: '1rem', color: '#bbb' }}>연동된 4개 채널의 데이터를 분석하여 최적의 전략을 제안합니다.</span>
              </p>
            </div>

            {/* 2️⃣ 🔥 여기에 드디어 historyList가 쓰입니다! (에러 해결의 핵심) 🔥 */}
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 5px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f3f5' }}>
              <h3 style={{ marginBottom: '20px', color: '#2D3436', fontWeight: 'bold' }}>📜 지난 분석 리포트 다시보기</h3>

              {safeHistoryList && safeHistoryList.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                  {safeHistoryList.slice(0,8).map((item: any) => (
                    <div 
                      key={item.id} 
                      onClick={()=> handleLoadHistory(item.id)}
                      style={{ padding: '20px', backgroundColor: '#F8F9FA', borderRadius: '15px', border: '1px solid #eee', cursor: 'pointer' }}>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '8px' }}>
                          📅 {new Date(item.created_at).toLocaleDateString()} 분석
                        </div>
                        <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#2D3436' }}>
                          {item.budget.toLocaleString()}원 최적화
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#0984e3' }}>
                          ✨ {item.best_channel} 집중 전략
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#b2bec3', textAlign: 'center', padding: '20px' }}>
                  아직 저장된 분석 기록이 없습니다. 사장님의 첫 분석을 시작해 보세요!
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default MarketingAnalysis;