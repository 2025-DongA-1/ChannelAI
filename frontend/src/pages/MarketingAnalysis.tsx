import React, { useState, useEffect } from 'react';
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
    
    // 300만 원 상한선 방어 로직
    if (numValue > 3000000) {
      numValue = 3000000; // 강제로 300만 원으로 깎음
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

      // 1. 오늘 날짜 기반으로 고정된 시드(seed) 만들기 (예: 20260319)
      const today = new Date();
      const baseSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

      // 🚨 [추가] 2. Math.random()을 대체할 커스텀 시드 랜덤 함수
      let currentSeed = baseSeed;
      const seededRandom = () => {
        const x = Math.sin(currentSeed++) * 10000;
        return x - Math.floor(x);
      };

      for (let i = days; i > 0; i--){
        const trend = 1.0 - (i * 0.01);
        dailyData.push({
          day: `${i}일차`,
          Naver: Math.floor((350 + seededRandom() * 50) * trend),
          Meta: Math.floor((220 + seededRandom() * 50) * trend),
          Google: Math.floor((280 + seededRandom() * 50) * trend),
          Karrot: Math.floor((300 + seededRandom() * 50) * trend),
        });
      }

      let features: FeatureItem[] = [];
      // const trendScore = currentDuration === 7 ? 90 : 50; -> 휴리스틱 알고리즘 이식 
      
      // ★ [수정] 무조건 4개 채널을 고정적으로 생성 (없으면 0으로 채움)
      const targetPlatforms = ['naver', 'meta', 'google', 'karrot'];
      
      // DB 데이터(realPerformance)가 없으면 빈 배열로 처리
      const dbList = dbData?.data?.performance || [];
      

      // ★ [수정됨] 마케팅 도메인 지식을 반영한 '플랫폼별 동적 트렌드 스코어(휴리스틱 모델)' 적용
      features = targetPlatforms.map(pName => {

        // 1. 기존 로직: DB 데이터 매칭 및 비용/ROAS 계산
        const matchedItems = dbList.filter((item: any) => 
          item.platform.toLowerCase().includes(pName)
        );
        
        const totalCost = matchedItems.reduce((sum: number, item: any) => sum + (item.metrics?.cost || 0), 0);
        const avgRoas = matchedItems.length > 0 
          ? matchedItems.reduce((sum: number, item: any) => sum + (item.metrics?.roas || 0), 0) / matchedItems.length
          : 0;
        
        // 💡 2. [핵심 알고리즘] 플랫폼별 & 캠페인 기간별 트렌드 가중치 산출
        let dynamicTrendScore = 50; // 기본값
        
        if (pName === 'meta') {
            // 메타(인스타/페북): 숏폼 바이럴 등 단기(7일 이하) 확산에 강력함. 장기로 갈수록 피로도 누적.
            dynamicTrendScore = currentDuration <= 7 ? 85 : 60; 
        } else if (pName === 'google') {
            // 구글(유튜브/검색): 초반엔 머신러닝 최적화 학습 기간이 필요. 장기(30일)로 갈수록 데이터가 쌓여 고효율 달성.
            dynamicTrendScore = currentDuration >= 30 ? 90 : 55;
        } else if (pName === 'naver') {
            // 네이버: 한국 시장의 기본 검색 인텐트(의도) 기반. 기간에 흔들리지 않는 안정적인 베이스캠프.
            dynamicTrendScore = 80;
        } else if (pName === 'karrot') {
            // 당근마켓: 철저한 지역 기반(Hyper-local). 주말이나 단기(7일 이하) 프로모션에 극도로 특화.
            dynamicTrendScore = currentDuration <= 7 ? 85 : 50;
        }

        // 3. [현실성 부여] 기계적인 고정값을 탈피하기 위해 약간의 랜덤 노이즈(-3 ~ +3) 추가
        dynamicTrendScore += Math.floor(seededRandom() * 7) - 3;

        return {
          "채널명_Naver": pName === 'naver' ? 1 : 0,
          "채널명_Meta": pName === 'meta' ? 1 : 0,
          "채널명_Google": pName === 'google' ? 1 : 0,
          "채널명_Karrot": pName === 'karrot' ? 1 : 0, 
          
          "비용": Number(totalCost),
          "ROAS": Number(avgRoas),
          "trend_score": Math.max(0, Math.min(100, dynamicTrendScore)) // 점수가 무조건 0~100 사이에 있도록 안전장치
        };
      });
      

      // 백엔드 요청
      const cleanBudget = Number(budget.toString().replace(/,/g, ''));
      
      // 💡 [개선점] 분석 데이터(dbData) 기준 가장 마지막(최근) 날짜를 추출해서 시드로 사용합니다!
      const allDates = dbList.map((item: any) => item.date).filter(Boolean);
      const latestDate = allDates.length > 0 ? allDates.sort().reverse()[0] : new Date().toISOString().split('T')[0];
      const seedDateStr = latestDate.replace(/-/g, ''); // "yyyyMMdd" 형식으로 변환

      // [2026-03-06] 로컬과 운영 서버 모두 Node.js(3000포트) 환경의 단일 통신 경로로 일원화
      const response = await api.post(`/ai/recommend`, {
        user_id : user?.id,
        total_budget: cleanBudget,
        features: features,
        history_data : dailyData,
        duration : currentDuration,
        seed_date: seedDateStr
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
 // const dbList = dbData?.data?.performance || [];
 // const totalInputCost = dbList.reduce((acc: number, cur: any) => acc + (cur.metrics?.cost || 0), 0);

  // rows에서 데이터만 가져오기
  const safeHistoryList = historyList?.rows ? historyList.rows : (Array.isArray(historyList) ? historyList : []);

  // ─── [추가할 코드] AI 리포트를 카드 형태로 예쁘게 조립해주는 파서 함수 ───
  // ─── [최종 완성본] 카드 헤더 색상 채우기 및 1/2순위 정밀 강조 적용 ───
  const renderReportCards = (reportText: string) => {
    if (!reportText) return <p className="text-center text-[#868e96]">분석 중입니다...</p>;

    const lines = reportText.split('\n').map(line => line.trim()).filter(line => line !== '');
    const elements = [];
    let currentCards: any[] = [];
    let currentSection = 'summary';

    const flushCards = () => {
      if (currentCards.length > 0) {
        elements.push(
          <div key={`card-grid-${elements.length}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 mb-8">
            {currentCards}
          </div>
        );
        currentCards = [];
      }
    };

    // 💡 [개선] 1순위 문장인지(isPrimaryLine) 판별하여 강조 효과를 다르게 줍니다.
    const renderFormattedText = (text: string, section: string, isPrimaryLine: boolean = false) => {
      let cleanText = text.replace(/\*\*/g, '');

      if (section === 'summary') {
        // 플랫폼 이름과 숫자%p 를 동시에 찾아냅니다.
        const parts = cleanText.split(/(네이버|인스타그램\/페이스북|인스타그램|페이스북|메타|구글\/유튜브|구글|유튜브|당근|\d+(?:\.\d+)?%p)/);
        
        return parts.map((part, idx) => {
          // 1. 수익률(숫자%p)은 위치 상관없이 무조건 굵게 처리
          if (/\d+(?:\.\d+)?%p/.test(part)) {
             return <strong key={idx} className="font-extrabold text-[#2D3436] text-[1.05em]">{part}</strong>;
          }
          // 2. 플랫폼 이름은 첫 번째 줄(isPrimaryLine)일 때만 색상을 입힙니다.
          if (isPrimaryLine && ['네이버', '인스타그램/페이스북', '인스타그램', '페이스북', '메타', '구글/유튜브', '구글', '유튜브', '당근'].includes(part)) {
            let highlightColor = "text-[#2D3436]";
            if (part.includes('네이버')) highlightColor = "text-[#2DB400]";
            else if (part.includes('구글') || part.includes('유튜브')) highlightColor = "text-[#EA4335]";
            else if (part.includes('인스타') || part.includes('메타') || part.includes('페이스북')) highlightColor = "text-[#1877F2]";
            else if (part.includes('당근')) highlightColor = "text-[#FF6F0F]";
            
            return <strong key={idx} className={`font-extrabold text-[1.1em] ${highlightColor}`}>{part}</strong>;
          }
          // 2순위 플랫폼이거나 나머지 텍스트는 원래대로 얌전하게 출력
          return part;
        });
      } else if (section === 'action' || section === 'platform') {
        return text.split('**').map((part, idx) => {
          if (idx % 2 === 1) return <strong key={idx} className="font-extrabold text-[1.05em] text-[#2D3436]">{part}</strong>;
          return part;
        });
      } else {
        return cleanText;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // 1. 대제목 (🎯 등 핵심 요약)
      if (line.includes('🎯')) {
        flushCards();
        currentSection = 'summary';
        const parts = line.replace('🎯', '').split(':');
        const title = parts[0].trim();
        const restOfLine = parts.slice(1).join(':').trim(); 

        elements.push(
          <div key={`title-${i}`} className="mb-4 mt-6">
             <h4 className="text-[1.3rem] md:text-[1.5rem] font-extrabold text-[#2D3436] inline-block shadow-[inset_0_-10px_0_rgba(255,234,167,0.5)]">
               🎯 {title}
             </h4>
          </div>
        );

        if (restOfLine) {
          elements.push(
            <div key={`text-${i}-inline`} className="text-[1.1rem] md:text-[1.25rem] text-[#343a40] mb-3 pl-1 break-keep leading-relaxed font-medium">
              {/* 요약본 첫 줄이므로 true를 보내어 1순위 플랫폼 색상을 켭니다 */}
              {renderFormattedText(restOfLine, 'summary', true)}
            </div>
          );
        }
      }
      // 2. 소제목
      else if (line.includes('📢') || line.includes('✅') || line.includes('🔍') || line.includes('📌') || line.includes('알고리즘')) {
        flushCards();
        
        if (line.includes('진단')) currentSection = 'platform';
        else if (line.includes('가이드')) currentSection = 'action';
        else if (line.includes('알고리즘') || line.includes('제약조건')) currentSection = 'algorithm';

        elements.push(
          <div key={`subtitle-${i}`} className="text-[1.15rem] md:text-[1.4rem] font-black text-[#2D3436] mt-10 mb-5 border-b pb-2 border-[#f1f3f5]">
            {line}
          </div>
        );
      }
      // 3. 내용 파싱
      else if (line.startsWith('•') || line.startsWith('-')) {
        const cleanLine = line.replace(/^[•-]/, '').trim();

        if (currentSection === 'platform') {
          const platformName = cleanLine.replace(/\*\*/g, '');
          const cardDetails = [];
          
          while (i + 1 < lines.length && !lines[i + 1].startsWith('•') && !lines[i + 1].includes('✅') && !lines[i + 1].includes('📌') && lines[i + 1].trim() !== '') {
             i++;
             cardDetails.push(lines[i].replace(/^-/, '').trim());
          }

          // 💡 [핵심 개선] 카드 헤더의 배경색, 글자색, 테두리색을 통째로 제어합니다.
          let headerBgClass = 'bg-[#f1f3f5]';
          let headerTextClass = 'text-[#2D3436]';
          let borderClass = 'border-[#e9ecef]';

          if (platformName.includes('네이버')) {
             headerBgClass = 'bg-[#2DB400]'; headerTextClass = 'text-white'; borderClass = 'border-[#2DB400]';
          } else if (platformName.includes('인스타') || platformName.includes('메타') || platformName.includes('페이스북')) {
             headerBgClass = 'bg-[#1877F2]'; headerTextClass = 'text-white'; borderClass = 'border-[#1877F2]';
          } else if (platformName.includes('구글') || platformName.includes('유튜브')) {
             headerBgClass = 'bg-[#EA4335]'; headerTextClass = 'text-white'; borderClass = 'border-[#EA4335]';
          } else if (platformName.includes('당근')) {
             headerBgClass = 'bg-[#FF6F0F]'; headerTextClass = 'text-white'; borderClass = 'border-[#FF6F0F]';
          }

          currentCards.push(
            <div key={`card-${i}`} className={`bg-white rounded-xl border ${borderClass} shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition-all overflow-hidden flex flex-col`}>
              
              {/* 💡 헤더 영역: 배경색 채우기 + 흰색 글씨 */}
              <div className={`${headerBgClass} px-5 py-3 md:px-6 md:py-3.5`}>
                <h5 className={`text-lg font-bold m-0 ${headerTextClass}`}>
                  {platformName}
                </h5>
              </div>
              
              {/* 본문 영역: 기존 흰색 바탕 유지 */}
              <div className="p-5 md:p-6 flex-1 bg-white">
                <ul className="flex flex-col gap-3">
                  {cardDetails.map((detail, idx) => {
                    const parts = detail.split(':');
                    const cleanLabel = parts[0]?.trim().replace(/\*\*/g, '') || ''; 
                    const value = parts.slice(1).join(':').trim(); 

                    if (!value) {
                       return <li key={idx} className="text-[#636e72] font-medium text-[0.95rem] md:text-[1rem] leading-snug break-keep">{cleanLabel}</li>;
                    }

                    let valueStyle = "text-[#636e72] font-medium";
                    let labelStyle = "text-[#868e96] font-bold w-[90px] shrink-0 mt-[2px]";

                    if (cleanLabel.includes('전략 제안')) {
                      valueStyle = "text-[#0984e3] font-extrabold bg-[#e3f2fd] px-2 py-1 rounded-md inline-block";
                      labelStyle = "text-[#2D3436] font-extrabold w-[90px] shrink-0 mt-[2px]";
                    } else if (cleanLabel.includes('현상') || cleanLabel.includes('기대 효과')) {
                      valueStyle = "text-[#2D3436] font-bold";
                    }

                    return (
                      <li key={idx} className="flex flex-col sm:flex-row sm:gap-4 text-[0.95rem] md:text-[1rem] leading-snug">
                        <span className={labelStyle}>{cleanLabel}</span>
                        <span className={`flex-1 break-keep ${valueStyle}`}>{renderFormattedText(value, 'platform')}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        }
        else if (currentSection === 'action') {
           flushCards(); 
           elements.push(
             <div key={`guide-${i}`} className="flex gap-3 items-start mb-4 bg-[#f8f9fa] border border-[#e9ecef] p-4 md:p-5 rounded-xl">
               <span className="font-bold mt-[2px] text-[#2DB400] text-lg">✔</span>
               <span className="font-medium leading-relaxed break-keep text-[1.05rem] md:text-[1.15rem] text-[#2D3436]">
                 {renderFormattedText(cleanLine, 'action')}
               </span>
             </div>
           );
        }
        else if (currentSection === 'algorithm') {
           flushCards();
           elements.push(
             <div key={`algo-${i}`} className="flex gap-3 items-start mb-2 pl-2 mt-1">
               <span className="font-bold mt-[2px] text-[#868e96]">•</span>
               <span className="text-[0.95rem] md:text-[1.05rem] text-[#495057] font-medium leading-relaxed break-keep">
                 {renderFormattedText(cleanLine, 'algorithm')}
               </span>
             </div>
           );
        }
      }
      else {
        flushCards();
        elements.push(
          <div key={`text-${i}`} className={`mb-3 pl-1 break-keep leading-relaxed font-medium ${currentSection === 'summary' ? 'text-[1.1rem] md:text-[1.25rem] text-[#343a40]' : 'text-[0.95rem] md:text-[1.05rem] text-[#495057]'}`}>
            {/* 요약본의 두 번째 줄(2순위 등)이므로 기본값 false 적용 -> 색상 없음 */}
            {renderFormattedText(line, currentSection)}
          </div>
        );
      }
    }
    
    flushCards();
    return elements;
  };

  return (
    <div className="min-h-screen px-4 md:px-6 py-8 md:py-10" style={{ backgroundColor: BG_COLOR, fontFamily: '"Pretendard", sans-serif' }}>
      
      {/* 1. 헤더 및 입력 섹션 */}
      <div className="max-w-[1200px] mx-auto mb-8">
        <header className="mb-8 md:mb-10 text-center">
          
          <div className="inline-block bg-[#dfecfa] text-[#03458c] px-3 py-1.5 md:px-4 md:py-1.5 rounded-full text-sm md:text-lg font-bold mb-3 md:mb-4 border border-[#d9e6f5]">
            ✅ 4개 채널 데이터 연동 완료
          </div>

          <h1 className="text-2xl md:text-[2.5rem] font-extrabold mb-2 md:mb-3 tracking-tight text-[#2D3436]">
            📢 사장님을 위한 AI 광고 예산 비서
          </h1>
          <p className="text-base md:text-lg text-[#636e72] px-2 break-keep">
            복잡한 데이터 분석은 AI에게 맡기고, <strong className="text-[#0984e3]">가장 효과 좋은 곳</strong>에만 돈을 쓰세요!
          </p>
        </header>

        {/* 상단 입력 바 */}
        <div className="bg-white p-6 md:px-10 md:py-8 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.05)] border border-[#f1f3f5] flex flex-col md:flex-row items-center justify-center gap-5 md:gap-6">
          <span className="text-lg md:text-xl font-bold text-[#2D3436] text-center break-keep">
            하루 광고비, 얼마를 최적화할까요?
          </span>
          
          <div className="flex flex-col relative w-full md:w-auto items-center">
            <div className="relative flex items-center w-full md:w-auto justify-center">
               <input
                type="text" 
                value={budget}
                onChange={handleBudgetChange}
                placeholder="예: 500,000"
                className="w-full md:w-[220px] px-5 py-3 md:py-3.5 pr-10 text-lg md:text-xl font-bold text-[#2D3436] rounded-xl outline-none text-right bg-[#fdfdfd] transition-colors"
                style={{ 
                  border: budgetWarning ? '2px solid #ff6b6b' : '2px solid #dfe6e9', 
                }}
              />
              <span className="absolute right-4 font-bold text-[#b2bec3] text-base md:text-lg pointer-events-none">원</span>
            </div>
            
            {/* 2. 💡 수정한 동적 안내 문구 (여기가 통째로 바뀐 부분!) */}
            <div className={`absolute top-full left-1/2 -translate-x-1/2 text-xs md:text-[0.85rem] mt-2 whitespace-nowrap transition-colors duration-300 ${budgetWarning ? 'text-[#ff6b6b] font-bold' : 'text-[#a4b0be] font-medium'}`}>
              {budgetWarning 
                ? "⚠️ 300만 원까지만 입력 가능합니다." 
                : "※ AI 정밀 예측 최적화 한도는 300만 원입니다."}
            </div>

          </div>
          {/* 트렌드분석 버튼 */}
          <button
            onClick={() => getRecommendation()}
            disabled={loading}
            className="w-full md:w-auto mt-6 md:mt-0 px-6 py-3.5 md:px-8 md:py-3.5 text-base md:text-lg font-bold bg-[#2d3436cd] text-[#e9c704] border border-[#2d3436cd] rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(233,199,4,0.15)] transition-all duration-300"
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
               <span className="text-[#b2bec3]">AI 분석 중... ⏳</span>
            ) : (
               <>
                 <span> AI 트렌드 분석 실행</span> 
               </>
            )}
          </button>
        </div>
      </div>

      {/* 2. 하단 결과 대시보드 영역 */}
      <div className="max-w-[1200px] mx-auto">
        {result ? (
          // ▼ 내 입력 데이터가 1원이라도 있니?
          // totalInputCost>0 ? ( -> CASE B가 사라지면서 조건도 없앰
            
            /* ─── CASE A: 데이터가 있어서 그래프를 보여주는 화면 ─── */
            <div className="flex flex-col gap-6 md:gap-8">

              {/* 핵심 지표 (KPI Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-[0_5px_20px_rgba(0,0,0,0.03)] text-center">
                  <span className="text-sm md:text-base text-[#888] font-bold">💰 예측 총 매출액</span>
                  <div className="text-3xl md:text-[2.5rem] font-black text-[#2D3436] mt-2 md:mt-3 tracking-tight">
                    {Math.round(result.expected_revenue).toLocaleString()}원
                  </div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-[0_5px_20px_rgba(0,0,0,0.03)] text-center">
                  <span className="text-sm md:text-base text-[#888] font-bold">🏆 베스트 전략</span>
                  <div className="text-2xl md:text-[2rem] font-black text-[#0984e3] mt-2 md:mt-3 tracking-tight break-keep">
                    {barData.length > 0 ? barData.reduce((prev, current) => (prev.roas > current.roas) ? prev : current).name : '-'} 집중 공략
                  </div>
                </div>
              </div>

              {/* ★ [복구됨] 꺾은선 그래프를 감싸는 하얀색 배경 박스 시작 */}
              <div className="bg-white p-6 md:p-9 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] mt-1 md:mt-3">
                
                {/* 꺾은선 그래프 상단 타이틀 영역 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  {/* 왼쪽: 제목과 버튼 */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                    <h3 className="text-xl md:text-[1.3rem] m-0 text-[#333] font-bold">📉 AI 플랫폼별 성과 예측 시뮬레이션</h3>
                    <div className="flex bg-[#f1f3f5] rounded-full p-1 w-full md:w-auto">
                      <button 
                        onClick={() => handlePeriodChange(7)}
                        className={`flex-1 md:flex-none px-4 py-1.5 rounded-full border-none cursor-pointer font-bold text-sm transition-all duration-200 ${period === 7 ? 'bg-white text-[#2D3436] shadow-[0_2px_5px_rgba(0,0,0,0.1)]' : 'bg-transparent text-[#868e96]'}`}
                      >
                        7일 시뮬레이션
                      </button>
                      <button 
                        onClick={() => handlePeriodChange(30)}
                        className={`flex-1 md:flex-none px-4 py-1.5 rounded-full border-none cursor-pointer font-bold text-sm transition-all duration-200 ${period === 30 ? 'bg-white text-[#2D3436] shadow-[0_2px_5px_rgba(0,0,0,0.1)]' : 'bg-transparent text-[#868e96]'}`}
                      >
                        30일 시뮬레이션
                      </button>
                    </div>
                  </div>
                  
                  {/* 오른쪽 텅 빈 공간에 뱃지 형태로 Tip */}
                  <div className="text-xs md:text-[0.85rem] text-[#0984e3] bg-[#e3f2fd] px-3 py-1.5 md:px-3.5 md:py-1.5 rounded-full font-bold self-end md:self-auto">
                    💡 Tip. 선이나 플랫폼명에 마우스를 올려보세요!
                  </div>
                </div>

                <div className="w-full min-h-[250px] md:min-h-[320px] h-[250px] md:h-[320px] relative">
                  {mounted && result?.history?.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                      <LineChart data={result.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis 
  dataKey="day" 
  tick={{ fontSize: 11, fill: '#888' }} 
  axisLine={false} 
  tickLine={false} 
  dy={10} 
  // 💡 1. 7일은 무조건 다 보여주고(0), 30일은 양끝(1일차, D-Day)을 살리되 중간은 알아서 생략하라는 명령어
  interval={period === 7 ? 0 : "preserveStartEnd"} 
  // 💡 2. 라벨과 라벨 사이에 최소 20px의 여백을 무조건 보장하라는 강력한 제약 조건
  minTickGap={20} 
/>
                        <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
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
                
                <div className="text-right mt-2 pr-2 md:pr-4">
                  <span className="text-[11px] md:text-[0.85rem] text-[#7c7c7c] break-keep">
                    * 본 그래프는 현재 시장 트렌드를 반영하여 AI가 가상으로 시뮬레이션한 예측 흐름입니다.
                  </span>
                </div>

              </div> 

              {/* 예산 비중 & 매체 효율 */}
              <div className="bg-white p-6 md:p-9 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  {/* 파이 차트 */}
                  <div className="text-center min-w-0 overflow-hidden">
                    <h3 className="text-lg md:text-[1.2rem] mb-4 md:mb-5 text-[#333] font-bold">💰 플랫폼별 예산 추천 비율</h3>
                    <div className="w-full h-[250px] md:h-[300px] relative">
                      {mounted && pieData?.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
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
                  <div className="border-t lg:border-t-0 lg:border-l border-[#f1f3f5] pt-8 lg:pt-0 lg:pl-12 min-w-0 overflow-hidden">
                    <h3 className="text-lg md:text-[1.2rem] mb-4 md:mb-5 text-[#333] font-bold text-center lg:text-left">📈 플랫폼별 예측 효율 (ROAS)</h3>
                      <div className="w-full h-[250px] md:h-[300px] relative">
                        {mounted && barData?.length > 0 && (
                          <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <BarChart data={barData} layout="vertical" margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#f1f3f5" />
                              <XAxis type="number" hide />
                              <YAxis
                                dataKey="name"
                                type="category"
                                width={70}
                                tick={{ fontSize: 13, fontWeight: 'bold', fill: '#555' }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                formatter={(value: any) => [`${value}%`, '예측 ROAS']}
                                cursor={{ fill: '#f8f9fa' }}
                                contentStyle={{ borderRadius: '10px', border: 'none' }}
                              />
                              <Bar dataKey="roas" barSize={30} radius={[0, 10, 10, 0]}>
                                <LabelList
                                  dataKey="roas"
                                  position="right"
                                  formatter={(v: any) => `${v}%`}
                                  style={{ fontSize: '13px', fontWeight: 'bold', fill: '#333' }}
                                />
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
              <div className="bg-[#F8F9FA] border border-[#E9ECEF] p-6 md:p-10 rounded-2xl md:rounded-[2rem] mt-2 md:mt-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 mb-6 md:mb-8">
                  <span className="text-3xl md:text-4xl">👩🏻‍🏫</span>
                  <h3 className="text-xl md:text-[1.8rem] font-extrabold text-[#2D3436] m-0 break-keep">
                    AI 마케팅 컨설팅 리포트
                  </h3>
                </div>

                {/* 👇 복잡했던 map 로직 대신 새로 만든 함수를 호출합니다 👇 */}
                <div className="font-sans break-keep">
                  {result.ai_report ? renderReportCards(result.ai_report) : "분석 중입니다..."}
                </div>

                {/* ★ 가독성과 전문성을 높인 하단 안내 영역 ★ */}
                <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-[#E9ECEF]">
                  <div className="bg-white border border-[#dee2e6] p-4 md:p-6 rounded-xl flex flex-col md:flex-row gap-3 md:gap-4 items-start">
                    <div className="text-[1.2rem] md:text-[1.4rem] mt-[2px]">⚠️</div>
                    <div className="flex flex-col gap-2 md:gap-3 w-full">
                      
                      {/* 1. 분석 모델 안내 */}
                      <div className="text-xs md:text-[0.85rem] text-[#868e96] tracking-tight break-keep">
                        본 분석은 연동된 광고 실시간 데이터를 바탕으로 <strong style={{color: '#495057'}}>XGBoost+Ridge 모델</strong>과 <strong style={{color: '#495057'}}>선형 계획법 알고리즘</strong>을 통해 산출되었습니다.
                      </div>

                      {/* 2. 법적 면책 조항 (가독성 개선) */}
                      <div className="text-[0.85rem] md:text-[0.95rem] text-[#495057] leading-relaxed break-keep border-t border-dashed border-[#eee] pt-3">
                        <strong className="text-[#2D3436] block mb-1.5">[면책 조항 및 분석 한계 안내]</strong>
                        • 위 결과는 AI 모델이 도출한 <strong>'예측값'</strong>이며, 미래의 실제 매출이나 광고 수익률을 보장하지 않습니다.<br />
                        • 시장 상황 및 외부 요인에 따라 실제 결과는 다를 수 있으므로 <strong className="text-[#2D3436]">참고용 보조 지표</strong>로만 활용하시기 바랍니다.<br />
                        • 최종적인 예산 집행 및 광고 운영에 대한 모든 책임은 사용자에게 있습니다.
                      </div>

                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            
            /* ─── CASE B: 연동은 성공했지만 데이터가 0인 경우 (빈 화면) ─── */
            // 원래는 있었지만 데이터가 없는 콜드 스타트 사용자를 위해 지움 - 이 사용자들은 트렌드스코어로 예측
            /* <div style={{ ... }}> ... </div> ) : ( */

          /* ─── CASE C: 아직 분석 버튼을 누르지 않은 초기 화면 ─── */
          // ✅ 1. 부모 박스(<div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>)로 두 영역을 감싸줍니다.
          <div className="flex flex-col gap-6 md:gap-8">
            
            {/* 1️⃣ 사장님의 기존 안내 문구 영역 (절대 건드리지 않음) */}
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl md:rounded-[20px] border-2 border-dashed border-[#e0e0e0] text-[#aaa] min-h-[300px] md:min-h-[400px] p-6 md:p-8">
              <div className="text-5xl md:text-6xl mb-4 md:mb-5 opacity-50">📊</div>
              <p className="text-base md:text-xl text-center leading-relaxed break-keep">
                상단에 예산을 입력하고 <strong>AI 트렌드 분석 실행</strong> 버튼을 눌러주세요.<br/>
                <span className="text-sm md:text-base text-[#bbb] block mt-1.5 break-keep">연동된 4개 채널의 데이터를 분석하여 최적의 전략을 제안합니다.</span>
              </p>
            </div>

            {/* 2️⃣ 🔥 여기에 드디어 historyList가 쓰입니다! (에러 해결의 핵심) 🔥 */}
            <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[20px] shadow-[0_5px_15px_rgba(0,0,0,0.02)] border border-[#f1f3f5]">
              <h3 className="mb-4 md:mb-5 text-lg md:text-xl text-[#2D3436] font-bold">📜 지난 분석 리포트 다시보기</h3>

              {safeHistoryList && safeHistoryList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                  {safeHistoryList.slice(0,8).map((item: any) => (
                    <div 
                      key={item.id} 
                      onClick={()=> handleLoadHistory(item.id)}
                      className="p-4 md:p-5 bg-[#F8F9FA] rounded-xl border border-[#eee] cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all duration-200"
                    >
                        <div className="text-xs md:text-[0.85rem] text-[#888] mb-2">
                          📅 {new Date(item.created_at).toLocaleDateString()} 분석
                        </div>
                        <div className="font-extrabold text-lg md:text-[1.2rem] text-[#2D3436]">
                          {item.budget.toLocaleString()}원 최적화
                        </div>
                        <div className="mt-2 md:mt-2.5 text-[0.85rem] md:text-[0.9rem] text-[#0984e3]">
                          ✨ {item.best_channel} 집중 전략
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[#b2bec3] text-center p-5 text-sm md:text-base break-keep">
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