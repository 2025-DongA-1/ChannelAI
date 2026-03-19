import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  BarChart3, 
  Target, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Zap,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

export default function MainPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "모든 기능이 무료인가요?",
      a: "Plan BE의 핵심인 '통합 대시보드'와 '기본 AI 예산 진단'은 소상공인 사장님들을 위해 무료로 제공됩니다! 다만, 더 깊이 있는 '프리미엄 AI 상세 리포트'와 매일/매주 편하게 받아보시는 '리포트 자동 발송 서비스'는 합리적인 가격의 구독제로 운영될 예정입니다."
    },
    {
      q: "어떤 광고 매체들을 연동할 수 있나요?",
      a: "현재 네이버 검색광고, 메타(페이스북/인스타그램), 구글 애즈 연동을 기본적으로 지원합니다. 또한 소상공인 필수 매체인 '당근마켓 광고' 데이터도 연동하여 한곳에서 모아보실 수 있습니다."
    },
    {
      q: "광고 계정 연동 시 제 정보는 안전한가요?",
      a: "물론입니다! Plan BE는 오직 광고 '성과 데이터'만을 읽기 전용으로 안전하게 수집합니다. 사장님의 개인정보나 결제/카드 정보는 시스템에 절대 저장되지 않으니 안심하셔도 됩니다."
    },
    {
      q: "데이터가 업데이트되는 주기는 어떻게 되나요?",
      a: "Plan BE의 '연동' 메뉴에서 동기화 버튼을 누르시면 그 즉시 최신 데이터로 업데이트됩니다! 실시간 성과가 궁금할 때마다 버튼 한 번으로 빠르고 정확하게 데이터를 모아보세요."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      
      {/* 1. Hero Section (첫인상 & 후킹) */}
      <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 -z-10" />
        {/* 장식용 배경 원 */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[30rem] h-[30rem] bg-indigo-100/50 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-medium text-sm mb-8 animate-fade-in-up">
            <Sparkles className="w-4 h-4" />
            <span>소상공인 맞춤형 AI 예산 최적화 솔루션</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-8 leading-tight">
            마케팅 예산 누수, <br className="hidden sm:block" />
            {/* 💡 [수정됨] inline-block과 mt-4를 추가하여 위아래 줄 간격을 시원하게 띄웠습니다! */}
            <span className="inline-block mt-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              AI가 완벽하게 막아드립니다.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            네이버, 메타, 구글에 흩어진 내 광고비. <br className="hidden sm:block" />
            어디서 돈이 새고 있는지, 어디에 투자해야 수익이 나는지 <br className="hidden sm:block" />
            <strong className="font-semibold text-gray-900">Plan BE</strong>가 정확히 짚어드립니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative z-10">
            {isAuthenticated ? (
              <Link to="/dashboard" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors duration-200 shadow-lg w-full sm:w-auto cursor-pointer select-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
                내 대시보드로 이동
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors duration-200 shadow-lg w-full sm:w-auto cursor-pointer select-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
                  내 광고비 누수 확인하기
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-gray-700 bg-white border-2 border-gray-200 active:bg-gray-50 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-colors duration-200 w-full sm:w-auto cursor-pointer select-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
                  로그인
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 2. Pain Point Section (문제 제기 & 공감) */}
      <section className="py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              사장님, 혹시 <span className="text-red-500">밑 빠진 독</span>에 <br className="md:hidden"/>광고비를 붓고 계시진 않나요?
            </h2>
            <p className="text-lg text-gray-600">수많은 소상공인 사장님들이 겪고 있는 마케팅의 현실입니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="text-2xl mt-1">😥</div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">복잡한 데이터 확인</h4>
                <p className="text-gray-600 text-sm leading-relaxed">네이버, 인스타, 구글... 플랫폼마다 따로 로그인해서 지표를 확인하기 너무 벅차요.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="text-2xl mt-1">💸</div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">낮은 전환율</h4>
                <p className="text-gray-600 text-sm leading-relaxed">클릭은 꽤 나오는 것 같은데, 왜 실제 문의나 결제로 이어지지 않는지 모르겠어요.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="text-2xl mt-1">🤔</div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">예산 분배의 막막함</h4>
                <p className="text-gray-600 text-sm leading-relaxed">이번 달 남은 광고비 50만 원, 도대체 어디에 써야 가장 효과가 좋을지 감이 안 잡혀요.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <p className="text-xl font-semibold text-blue-700 bg-blue-50 inline-block px-6 py-3 rounded-full">
              데이터 분석 전문가가 없어도 괜찮습니다. Plan BE가 해결해 드립니다!
            </p>
          </div>
        </div>
      </section>

      {/* 3. Core Features (핵심 기능) */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="text-blue-600 font-bold tracking-wider uppercase text-sm">Core Features</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
              오직 성장에만 집중하시도록, <br className="md:hidden" />Plan BE의 3가지 무기
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-3xl bg-white border border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50 group-hover:bg-blue-600 rounded-2xl flex items-center justify-center mb-8 transition-colors duration-300">
                <BarChart3 className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">통합 성과 대시보드</h3>
              <p className="text-gray-600 leading-relaxed">
                여러 매체에 흩어진 광고 데이터를 한곳에서 확인하세요. 직관적인 차트와 지표로 현재 상황을 한눈에 파악할 수 있습니다.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-3xl bg-white border border-gray-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 transform lg:-translate-y-4">
              <div className="w-14 h-14 bg-indigo-50 group-hover:bg-indigo-600 rounded-2xl flex items-center justify-center mb-8 transition-colors duration-300">
                <Sparkles className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI 예산 최적화 추천</h3>
              <p className="text-gray-600 leading-relaxed">
                비효율 매체의 예산을 줄이고, 고효율 매체에 집중하세요. AI가 최적의 예산 재배분 플랜을 정확한 액수로 제안합니다.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-3xl bg-white border border-gray-200 hover:border-purple-500 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-purple-50 group-hover:bg-purple-600 rounded-2xl flex items-center justify-center mb-8 transition-colors duration-300">
                <Target className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">크로스 미디어 인사이트</h3>
              <p className="text-gray-600 leading-relaxed">
                단순히 사람만 끄는 '미끼 매체'와 실제 지갑을 여는 '핵심 매체'를 교차 분석하여 정확한 마케팅 진단을 내려드립니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How it Works (이용 방법) */}
      <section className="py-24 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Plan BE, 이렇게 100% 활용하세요!</h2>
            <p className="text-gray-400 text-lg">가입부터 수익률 상승까지, 사장님이 하실 일은 딱 3가지입니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* 연결선 (데스크탑) */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gray-700" />
            
            {/* Step 1 */}
            <div className="relative text-center z-10">
              <div className="w-24 h-24 mx-auto bg-gray-800 border-4 border-gray-900 rounded-full flex items-center justify-center mb-6 shadow-xl">
                <Zap className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Step 1. 계정 연동하기</h3>
              <p className="text-gray-400 leading-relaxed text-sm px-4">
                좌측 <strong className="text-white">[연동]</strong> 메뉴에서 네이버, 메타, 구글 등 사용 중인 광고 계정을 클릭 몇 번으로 간편하게 연결하세요.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center z-10 mt-8 md:mt-0">
              <div className="w-24 h-24 mx-auto bg-blue-600 border-4 border-gray-900 rounded-full flex items-center justify-center mb-6 shadow-xl">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-blue-400">Step 2. AI 분석 버튼 누르기</h3>
              <p className="text-gray-400 leading-relaxed text-sm px-4">
                데이터가 모이면 <strong className="text-white">[인사이트]</strong> 탭으로 이동해 'AI 분석 실행하기' 버튼을 누르고 우리 가게만의 진단 리포트를 받으세요.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center z-10 mt-8 md:mt-0">
              <div className="w-24 h-24 mx-auto bg-gray-800 border-4 border-gray-900 rounded-full flex items-center justify-center mb-6 shadow-xl">
                <TrendingUp className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Step 3. 액션 플랜 적용하기</h3>
              <p className="text-gray-400 leading-relaxed text-sm px-4">
                AI가 콕 집어준 매체별 <strong className="text-white">예산 증감 가이드</strong>에 따라 실제 광고비를 수정하고 ROAS(수익률)가 오르는 걸 확인하세요!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ (자주 묻는 질문) 섹션 */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">자주 묻는 질문</h2>
            <p className="text-lg text-gray-600">Plan BE 도입 전 사장님들이 가장 많이 물어보시는 질문들이에요.</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="border border-gray-200 rounded-2xl overflow-hidden transition-all duration-200 hover:border-blue-300 bg-white shadow-sm"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors focus:outline-none"
                >
                  <span className="font-bold text-gray-900 pr-4 text-lg">{faq.q}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-500 transition-transform duration-300 flex-shrink-0 ${openFaqIndex === index ? 'rotate-180 text-blue-600' : ''}`} 
                  />
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-6 pt-0 text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Final CTA (최종 행동 유도) */}
      <section className="py-24 bg-blue-600 text-center px-4">
        <div className="max-w-3xl mx-auto">
          <ShieldCheck className="w-16 h-16 text-blue-200 mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            더 이상 '감'으로 하는 <br className="md:hidden"/>마케팅은 그만!
          </h2>
          <p className="text-blue-100 text-lg mb-10">
            데이터 기반의 똑똑한 예산 분배를 지금 바로 경험해 보세요. <br className="hidden md:block" />
            초기 세팅 비용 없이 누구나 무료로 시작할 수 있습니다.
          </p>
          {!isAuthenticated && (
            <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-blue-600 bg-white hover:bg-gray-50 rounded-xl transition shadow-xl hover:-translate-y-1">
              Plan BE 무료로 체험하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer (하단 영역) */}
      <footer className="bg-gray-50 py-12 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <span className="text-2xl font-extrabold text-blue-600 tracking-wider">PLAN BE</span>
            <p className="mt-4 text-sm text-gray-500 leading-relaxed max-w-sm">
              소상공인과 마케터를 위한 가장 쉽고 강력한 AI 마케팅 예산 최적화 솔루션. 광고비 낭비를 멈추고 성장을 시작하세요.
            </p>
          </div>
          <div>
            <h4 className="text-gray-900 font-bold mb-4">서비스</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link to="/dashboard" className="hover:text-blue-600 transition">대시보드</Link></li>
              <li><Link to="/analysis" className="hover:text-blue-600 transition">AI 예산 분석</Link></li>
              <li><Link to="/insights" className="hover:text-blue-600 transition">인사이트 리포트</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-900 font-bold mb-4">고객지원</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link to="/terms" className="hover:text-blue-600 transition">이용약관</Link></li>
              <li><Link to="/privacy" className="hover:text-blue-600 transition">개인정보처리방침</Link></li>
              <li><a href="mailto:support@planbe.com" className="hover:text-blue-600 transition">문의하기</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Channel AI Team. All rights reserved.</p>
          <div className="flex gap-4">
            <span>사업자등록번호: 준비중</span>
            <span>대표: Channel AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}