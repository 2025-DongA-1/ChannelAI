import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { creativeAPI, campaignAPI } from '@/lib/api';
import {
  Sparkles, Upload, FileText, Image, Send, Copy, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Loader2, Clock, Palette, LayoutTemplate, Shield,
  PlusCircle, BarChart3
} from 'lucide-react';

interface CreativeResult {
  uspAnalysis: string;
  copies: {
    meta: { headlines: string[]; bodies: string[]; cta: string };
    google: { headlines: string[]; descriptions: string[]; cta: string };
    naver: { titles: string[]; descriptions: string[]; cta: string };
    karrot: { titles: string[]; bodies: string[]; cta: string };
  };
  visualGuide: {
    imageComposition: string;
    colorPalette: string;
    textOverlay: string;
    specs: Record<string, string>;
    abTestSuggestion: string;
  };
  strategy: string;
  complianceNotes: string;
}

const TONE_OPTIONS = [
  { value: 'professional', label: '전문적/신뢰감' },
  { value: 'friendly', label: '친근한/캐주얼' },
  { value: 'emotional', label: '감성적/따뜻한' },
  { value: 'trendy', label: '트렌디/MZ세대' },
  { value: 'luxury', label: '프리미엄/고급' },
  { value: 'urgent', label: '긴급/한정' },
];

const OBJECTIVE_OPTIONS = [
  { value: '인지도', label: '브랜드 인지도' },
  { value: '트래픽', label: '웹사이트/앱 트래픽' },
  { value: '전환', label: '구매/가입 전환' },
];

const BUSINESS_OPTIONS = [
  '이커머스', '음식/외식', '패션/뷰티', '교육', '금융/보험',
  '건강/의료', '부동산', '기술/IT', '출판/콘텐츠', '여행/레저', '기타',
];

type Mode = 'existing' | 'new'; // 기존 캠페인 개선 vs 신규 생성

export default function CreativeAgentPage() {
  const [mode, setMode] = useState<Mode>('existing'); // 기본값: 기존 캠페인 모드
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    businessType: '',
    productName: '',
    targetAudience: '',
    tone: 'friendly',
    objective: '전환',
    additionalInfo: '',
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>('meta');
  const docInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // --- Tutorial State ---
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [targetRect, setTargetRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const TOUR_STEPS = [
    { id: 'tour-mode', text: '기존 캠페인을 개선할지, 새로운 상품의 소재를 만들지 모드를 선택하세요. 기존 캠페인을 선택한다면 광고 성과를 기반 변수로 활용하여 광고 성과를 분석할 수 있습니다.' },
    { id: 'tour-form', text: '상품에 대한 기본적인 정보와 타겟, 목적을 입력해주세요.' },
    { id: 'tour-upload', text: '상품 소개서나 기존 광고 이미지를 업로드하면 AI가 더 정교하게 분석합니다.' },
    { id: 'tour-submit', text: '모든 입력을 마쳤다면 생성하기 버튼을 눌러 AI 소재 에이전트를 실행하세요!' }
  ];

  useEffect(() => {
    setShowTour(true);
  }, []);

  useEffect(() => {
    if (!showTour) return;
    
    const updateRect = () => {
      const currentId = TOUR_STEPS[tourStep]?.id;
      if (!currentId) return;
      const el = document.getElementById(currentId);
      if (el) {
        const rect = el.getBoundingClientRect();
        // 스크롤이 필요할 경우
        if (rect.top < 60 || rect.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            const newRect = el.getBoundingClientRect();
            let height = newRect.height;
            if (currentId === 'tour-form' && window.innerWidth < 768) {
              const bizEl = document.getElementById('tour-business');
              if (bizEl) {
                height = bizEl.getBoundingClientRect().bottom - newRect.top;
              }
            }
            setTargetRect({ x: newRect.left - 8, y: newRect.top - 8, w: newRect.width + 16, h: height + 16 });
          }, 400); // 스크롤 애니메이션 대기
        } else {
          let height = rect.height;
          if (currentId === 'tour-form' && window.innerWidth < 768) {
            const bizEl = document.getElementById('tour-business');
            if (bizEl) {
              height = bizEl.getBoundingClientRect().bottom - rect.top;
            }
          }
          setTargetRect({ x: rect.left - 8, y: rect.top - 8, w: rect.width + 16, h: height + 16 });
        }
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    
    // 모드가 바뀌면 form 크기가 바뀌므로 rect 재계산
    const timer = setTimeout(updateRect, 100);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      clearTimeout(timer);
    };
  }, [tourStep, showTour, mode]);

  const handleNextTour = () => {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(prev => prev + 1);
    } else {
      handleCloseTour();
    }
  };

  const handleCloseTour = () => {
    setShowTour(false);
  };
  // ----------------------

  // 캠페인 목록 조회 (기존 캠페인 모드용)
  const campaignsQuery = useQuery({
    queryKey: ['campaigns-list'],
    queryFn: async () => {
      const res = await campaignAPI.getCampaigns({ limit: 50 }); // 최근 50개
      return res.data.campaigns || [];
    },
    enabled: mode === 'existing', // 모드가 existing일 때만 조회
  });

  // 선택된 캠페인 정보 찾기
  const selectedCampaign = campaignsQuery.data?.find(
    (c: any) => c.id === Number(selectedCampaignId)
  );

  // 캠페인 선택 시 폼 자동 채우기
  useEffect(() => {
    if (selectedCampaign) {
      setFormData(prev => ({
        ...prev,
        productName: selectedCampaign.campaign_name, // 캠페인명을 상품명으로 가정 (수정 가능)
        // 플랫폼에 따라 목적 추론 (예시)
        objective: selectedCampaign.objective || '전환', // API 응답에 objective가 있다면
      }));
    }
  }, [selectedCampaign]);

  // 이력 조회
  const historyQuery = useQuery({
    queryKey: ['creative-history'],
    queryFn: async () => {
      const res = await creativeAPI.getHistory();
      return res.data.data;
    },
  });

  // 소재 생성 mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('businessType', formData.businessType || '기타'); // 필수값이므로 기본값 처리
      fd.append('productName', formData.productName);
      fd.append('targetAudience', formData.targetAudience);
      fd.append('tone', formData.tone);
      fd.append('objective', formData.objective);
      if (formData.additionalInfo) fd.append('additionalInfo', formData.additionalInfo);
      if (mode === 'existing' && selectedCampaignId) {
        fd.append('campaignId', selectedCampaignId);
      }
      if (documentFile) fd.append('document', documentFile);
      if (imageFile) fd.append('image', imageFile);
      
      const res = await creativeAPI.generate(fd);
      return res.data;
    },
    onSuccess: () => {
      historyQuery.refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName || !formData.targetAudience) {
      alert('상품명과 타겟 고객은 필수 입력 항목입니다.');
      return;
    }
    generateMutation.mutate();
  };

  const result: CreativeResult | null = generateMutation.data?.data || null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const togglePlatform = (p: string) => {
    setExpandedPlatform(expandedPlatform === p ? null : p);
  };

  return (
    <>
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 sm:p-3 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">AI 소재 에이전트</h1>
          <p className="text-xs sm:text-base text-gray-600 mt-0.5 sm:mt-1">
            상품 정보와 파일을 입력하면 4개 매체 맞춤형 광고 소재를 자동 생성합니다
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">

        {/* ─── 좌측: 입력 폼 ─── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            
            {/* 탭 토글 */}
            <div id="tour-mode" className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  mode === 'existing' 
                    ? 'bg-white text-violet-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> 기존 캠페인 개선
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  mode === 'new' 
                    ? 'bg-white text-violet-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <PlusCircle className="w-4 h-4" /> 새 상품 생성
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div id="tour-form" className="space-y-4">
              {/* 기존 캠페인 선택 (Existing 모드일 때만) */}
              {mode === 'existing' && (
                <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
                  <label className="block text-sm font-medium text-violet-900 mb-2">
                    개선할 캠페인 선택
                  </label>
                  {campaignsQuery.isLoading ? (
                    <div className="text-gray-500 text-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> 캠페인 정보를 불러오는 중...
                    </div>
                  ) : campaignsQuery.isError ? (
                    <div className="text-red-500 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> 캠페인 목록을 가져오지 못했습니다.
                    </div>
                  ) : (campaignsQuery.data?.length ?? 0) === 0 ? (
                    <div className="text-orange-500 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> 연동된 캠페인이 없습니다.
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedCampaignId}
                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                        className="w-full px-3 py-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm bg-white"
                      >
                        <option value="">캠페인을 선택하세요</option>
                        {campaignsQuery.data?.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.campaign_name} ({c.platform})
                          </option>
                        ))}
                      </select>
                      
                      {selectedCampaignId && selectedCampaign && (
                        <div className="mt-3 text-sm text-violet-800 bg-white/60 p-3 rounded border border-violet-100 space-y-1">
                          <p><strong>상태:</strong> {selectedCampaign.status}</p>
                          <p><strong>총 비용:</strong> {Number(selectedCampaign.total_cost).toLocaleString()}원</p>
                          <p><strong>ROAS:</strong> {(Number(selectedCampaign.total_revenue) / Number(selectedCampaign.total_cost || 1) * 100).toFixed(0)}%</p>
                          <p className="text-xs text-violet-600 mt-2 flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" /> 이 캠페인의 성과 데이터를 기반으로 개선점을 분석합니다.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 업종 */}
              <div id="tour-business">
                <label className="block text-sm font-medium text-gray-700 mb-1">업종 {mode === 'new' && '*'}</label>
                <select
                  value={formData.businessType}
                  onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  required={mode === 'new'}
                >
                  <option value="">선택하세요</option>
                  {BUSINESS_OPTIONS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>

              {/* 상품명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상품/서비스명 *</label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={e => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder={mode === 'existing' ? '캠페인 이름을 참고하여 입력됨' : '예: 수제 시그니처 케이크'}
                  required
                />
              </div>

              {/* 타겟 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">타겟 고객 *</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="예: 25~35세 직장 여성, 선물용 케이크 관심"
                  required
                />
              </div>

              {/* 톤 & 목적 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">톤앤매너</label>
                  <select
                    value={formData.tone}
                    onChange={e => setFormData({ ...formData, tone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm"
                  >
                    {TONE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">광고 목적</label>
                  <select
                    value={formData.objective}
                    onChange={e => setFormData({ ...formData, objective: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm"
                  >
                    {OBJECTIVE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* 추가 정보 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">추가 정보 (선택)</label>
                <textarea
                  value={formData.additionalInfo}
                  onChange={e => setFormData({ ...formData, additionalInfo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  rows={2}
                  placeholder="경쟁사 대비 차별점, 프로모션 정보 등"
                />
              </div>
              </div>

              {/* ─── 파일 업로드 영역 ─── */}
              <div id="tour-upload" className="border-t border-gray-200 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Upload className="w-4 h-4" /> 
                  {mode === 'existing' ? '추가 정보 업로드 (선택)' : '파일 업로드 (선택)'}
                </h3>
                {mode === 'existing' && (
                  <p className="text-xs text-gray-500 mb-2">
                    기존 캠페인 성과 데이터는 자동으로 반영됩니다. 
                    <br/>추가적으로 고려해야 할 상품 문서나 이미지가 있다면 업로드하세요.
                  </p>
                )}

                {/* 문서 업로드 */}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
                  onClick={() => docInputRef.current?.click()}
                >
                  <input
                    ref={docInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,.csv"
                    className="hidden"
                    onChange={e => setDocumentFile(e.target.files?.[0] || null)}
                  />
                  <FileText className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                  {documentFile ? (
                    <p className="text-sm text-violet-600 font-medium">{documentFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">상품 문서 (PDF, TXT, MD)</p>
                      <p className="text-xs text-gray-400">원고, 소개서 등 (최대 20MB, 3000자 이내 분석)</p>
                    </>
                  )}
                </div>

                {/* 이미지 업로드 */}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
                  onClick={() => imgInputRef.current?.click()}
                >
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp"
                    className="hidden"
                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                  />
                  <Image className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                  {imageFile ? (
                    <p className="text-sm text-violet-600 font-medium">{imageFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">기존 광고 이미지 (JPG, PNG)</p>
                      <p className="text-xs text-gray-400">AI가 분석하여 개선 방향 제안 (최대 2MB)</p>
                    </>
                  )}
                </div>
              </div>

              <button
                id="tour-submit"
                type="submit"
                disabled={generateMutation.isPending || (mode === 'existing' && !selectedCampaignId)}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg font-semibold hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> AI 소재 생성 중...</>
                ) : (
                  <><Send className="w-5 h-5" /> 
                    {mode === 'existing' ? '기존 캠페인 개선하기' : '광고 소재 생성하기'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 생성 이력 */}
          {historyQuery.data && historyQuery.data.length > 0 && (
            <div id="tour-history" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> 최근 생성 이력
              </h3>
              <div className="space-y-2">
                {historyQuery.data.slice(0, 5).map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">{h.product_name}</span>
                      <span className="text-gray-400 ml-2">({h.business_type})</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── 우측: 결과 표시 ─── */}
        <div className="lg:col-span-3 space-y-4">
          {generateMutation.isPending && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-violet-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">AI가 소재를 생성하고 있습니다</h3>
              <p className="text-sm text-gray-500 mt-2">상품 분석, 카피 작성, 비주얼 가이드까지 약 30초~1분 소요됩니다</p>
            </div>
          )}

          {generateMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-800">생성 실패</h4>
                <p className="text-sm text-red-600 mt-1">
                  {(generateMutation.error as any)?.response?.data?.message || '소재 생성 중 오류가 발생했습니다. 다시 시도해 주세요.'}
                </p>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* USP 분석 */}
              <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl p-4 sm:p-5">
                <h3 className="font-semibold text-violet-900 flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5" /> USP 분석 (핵심 소구점)
                </h3>
                <p className="text-sm text-violet-800 leading-relaxed">{result.uspAnalysis}</p>
              </div>

              {/* 매체별 카피 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-violet-500" /> 매체별 광고 카피
                  </h3>
                </div>

                {/* Meta */}
                <PlatformSection
                  platform="meta"
                  label="Meta (Instagram/Facebook)"
                  color="blue"
                  expanded={expandedPlatform === 'meta'}
                  onToggle={() => togglePlatform('meta')}
                  copyToClipboard={copyToClipboard}
                >
                  <CopyItems label="헤드라인" items={result.copies.meta.headlines} onCopy={copyToClipboard} />
                  <CopyItems label="본문" items={result.copies.meta.bodies} onCopy={copyToClipboard} />
                  <p className="text-sm"><strong>CTA:</strong> {result.copies.meta.cta}</p>
                </PlatformSection>

                {/* Google */}
                <PlatformSection
                  platform="google"
                  label="Google Ads"
                  color="red"
                  expanded={expandedPlatform === 'google'}
                  onToggle={() => togglePlatform('google')}
                  copyToClipboard={copyToClipboard}
                >
                  <CopyItems label="제목" items={result.copies.google.headlines} onCopy={copyToClipboard} />
                  <CopyItems label="설명문" items={result.copies.google.descriptions} onCopy={copyToClipboard} />
                  <p className="text-sm"><strong>CTA:</strong> {result.copies.google.cta}</p>
                </PlatformSection>

                {/* Naver */}
                <PlatformSection
                  platform="naver"
                  label="네이버 검색광고"
                  color="green"
                  expanded={expandedPlatform === 'naver'}
                  onToggle={() => togglePlatform('naver')}
                  copyToClipboard={copyToClipboard}
                >
                  <CopyItems label="제목" items={result.copies.naver.titles} onCopy={copyToClipboard} />
                  <CopyItems label="설명문" items={result.copies.naver.descriptions} onCopy={copyToClipboard} />
                  <p className="text-sm"><strong>CTA:</strong> {result.copies.naver.cta}</p>
                </PlatformSection>

                {/* 당근마켓 */}
                <PlatformSection
                  platform="karrot"
                  label="당근마켓"
                  color="orange"
                  expanded={expandedPlatform === 'karrot'}
                  onToggle={() => togglePlatform('karrot')}
                  copyToClipboard={copyToClipboard}
                >
                  <CopyItems label="제목" items={result.copies.karrot.titles} onCopy={copyToClipboard} />
                  <CopyItems label="본문" items={result.copies.karrot.bodies} onCopy={copyToClipboard} />
                  <p className="text-sm"><strong>CTA:</strong> {result.copies.karrot.cta}</p>
                </PlatformSection>
              </div>

              {/* 비주얼 가이드 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-fuchsia-500" /> 비주얼 가이드
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <InfoCard label="이미지 구성" value={result.visualGuide.imageComposition} />
                  <InfoCard label="색상 팔레트" value={result.visualGuide.colorPalette} />
                  <InfoCard label="텍스트 배치" value={result.visualGuide.textOverlay} />
                  <InfoCard label="A/B 테스트 제안" value={result.visualGuide.abTestSuggestion} />
                </div>
                {result.visualGuide.specs && Object.keys(result.visualGuide.specs).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">매체별 이미지 사이즈</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs text-gray-600">
                      {Object.entries(result.visualGuide.specs).map(([k, v]) => (
                        <span key={k}><strong>{k}:</strong> {v}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 전략 + 준수사항 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-1.5 mb-2 text-sm">
                    <Sparkles className="w-4 h-4 text-violet-500" /> 통합 전략
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.strategy}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-1.5 mb-2 text-sm">
                    <Shield className="w-4 h-4 text-orange-500" /> 광고 심사 가이드
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.complianceNotes}</p>
                </div>
              </div>
            </>
          )}

          {/* 초기 빈 상태 */}
          {!result && !generateMutation.isPending && !generateMutation.isError && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
              <Sparkles className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400">소재 생성 결과가 여기에 표시됩니다</h3>
              <p className="text-sm text-gray-300 mt-2">왼쪽 폼을 작성하고 생성 버튼을 눌러주세요</p>
            </div>
          )}
        </div>
      </div>
    </div>    
    {/* 튜토리얼 오버레이 */}
    {showTour && TOUR_STEPS[tourStep] && (
      <div className="fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center">
        {/* SVG Mask for Hole-Punch Effect */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="tour-hole">
              <rect width="100%" height="100%" fill="white" />
              <rect 
                x={targetRect.x} 
                y={targetRect.y} 
                width={targetRect.w} 
                height={targetRect.h} 
                rx="12" 
                fill="black" 
                className="transition-all duration-500 ease-in-out" 
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-hole)" className="transition-all duration-500" />
        </svg>

        {/* 하이라이트된 영역 툴팁 */}
        <div 
          className="absolute z-[101] transition-all duration-500 ease-in-out flex flex-col"
          style={{
            ...(() => {
              const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
              const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
              const boxWidth = Math.min(300, screenWidth - 32);
              
              // 화면 밖으로 나가지 않도록 left 위치 보정
              let leftPos = targetRect.x + targetRect.w / 2 - boxWidth / 2;
              leftPos = Math.max(16, Math.min(leftPos, screenWidth - boxWidth - 16));

              if (tourStep === 2) {
                // 3번째 스텝: 데스크톱은 우측, 모바일은 상단으로 배치 (생성 이력 없는 사용자 잘림 방지)
                if (!isMobile) {
                  return { top: targetRect.y, left: targetRect.x + targetRect.w + 20, width: boxWidth };
                }
                return { top: Math.max(16, targetRect.y - 180), left: leftPos, width: boxWidth };
              } else if (tourStep === 3) {
                // 4번째 스텝: 스포트라이트 상단
                return { top: Math.max(16, targetRect.y - 180), left: leftPos, width: boxWidth };
              } else {
                // 기본 (1, 2번째 스텝): 스포트라이트 하단
                return { top: targetRect.y + targetRect.h + 16, left: leftPos, width: boxWidth };
              }
            })()
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-5 relative animate-in fade-in zoom-in duration-300">
            {/* 동적 위치 꼬리표 */}
            <div className={`absolute w-4 h-4 bg-white rotate-45 transition-all duration-300 ${
              tourStep === 2 && !(typeof window !== 'undefined' && window.innerWidth < 768)
                ? "top-8 -left-2" // 데스크톱 3번째 스텝 (왼쪽을 향함)
                : (tourStep === 3 || (tourStep === 2 && (typeof window !== 'undefined' && window.innerWidth < 768)))
                ? "-bottom-2 left-1/2 -translate-x-1/2" // 모바일 3번째 & 모든 환경 4번째 (아래를 향함)
                : "-top-2 left-1/2 -translate-x-1/2" // 그 외 (위로 향함)
            }`} />
            <div className="relative z-10">
              <p className="text-[15px] leading-relaxed text-gray-800 font-medium whitespace-pre-wrap">
                {TOUR_STEPS[tourStep].text}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === tourStep ? 'w-4 bg-violet-600' : 'w-2 bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <button 
                  onClick={handleNextTour}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-1 shadow-md shadow-violet-200"
                >
                  {tourStep === TOUR_STEPS.length - 1 ? (
                    <>시작하기 <CheckCircle2 className="w-4 h-4" /></>
                  ) : (
                    <>다음 챕터</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 생략/바로 사용하기 버튼 */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[102] w-full px-4 flex justify-center">
          <button 
            onClick={handleCloseTour}
            className="group flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-bold text-sm sm:text-lg shadow-xl transition-all hover:scale-105 active:scale-95 w-full max-w-[280px] sm:max-w-none"
          >
            튜토리얼 건너뛰기
            <Send className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    )}
    </>
  );
}

// ─── 서브 컴포넌트 ─────────────────

const PLATFORM_COLORS: Record<string, string> = {
  blue: 'border-blue-200 bg-blue-50/50',
  red: 'border-red-200 bg-red-50/50',
  green: 'border-green-200 bg-green-50/50',
  orange: 'border-orange-200 bg-orange-50/50',
};

const PLATFORM_BADGE: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  red: 'bg-red-100 text-red-700',
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
};

function PlatformSection({
  label, color, expanded, onToggle, children,
}: {
  platform: string; label: string; color: string;
  expanded: boolean; onToggle: () => void;
  copyToClipboard: (t: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${PLATFORM_BADGE[color]}`}>{label}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className={`px-4 pb-4 space-y-2 mx-3 mb-3 rounded-lg border p-3 ${PLATFORM_COLORS[color]}`}>
          {children}
        </div>
      )}
    </div>
  );
}

function CopyItems({ label, items, onCopy }: { label: string; items: string[]; onCopy: (t: string) => void }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group mb-1">
          <p className="text-sm text-gray-800 flex-1">{i + 1}. {item}</p>
          <button
            onClick={() => onCopy(item)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/70 transition-opacity"
            title="복사"
          >
            <Copy className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  );
}
