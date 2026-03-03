import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { integrationAPI } from '../lib/api';
import { FileSpreadsheet, Plus, Download, Database, Trash2, AlertCircle, RefreshCw, Brain, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

// 🌟 1. DB의 상세 메트릭 컬럼들을 모두 포함하도록 인터페이스 확장!
interface AdData {
  id: string;
  date: string;
  month: string;
  dayOfWeek: string;
  media: string;
  campaign: string;
  group: string;
  creative: string;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cvr: number;
  cpa: number;
  roas: number;
  roi: number;
}

const MEDIA_LIST = ['google', 'meta', 'naver', 'karrot'];
const CAMPAIGN_NAMES = [
  '[봄맞이] 신상 프로모션_구매유도', 
  '[신규가입] 첫달 무료 이벤트_앱설치', 
  '[인지도] 브랜드 캠페인_웹방문', 
  '[시즌오프] 재고소진_리타겟팅', 
  '[지역광고] 오프라인 매장 홍보'
];

const DummyDataPage: React.FC = () => {
  const [data, setData] = useState<AdData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AdData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingDB, setIsExportingDB] = useState(false);
  
  const token = useAuthStore((state) => state.token);
  
  const [formData, setFormData] = useState<Partial<AdData>>({
    date: new Date().toISOString().split('T')[0],
    media: 'meta',
    cost: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
  });

  // 🌟 2. 플랫폼 선택 기능 추가!
  const [genConfig, setGenConfig] = useState({
    startDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    count: 3,
    platform: 'all', // 'all' 또는 특정 매체 이름
  });

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleGenerateDummy = () => {
    const { startDate, endDate, count, platform } = genConfig;
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const range = end - start;

    if (range < 0) return alert('시작일이 종료일보다 늦을 수 없습니다.');

    // 🌟 3. 선택한 플랫폼만 필터링해서 사용
    const availablePlatforms = platform === 'all' ? MEDIA_LIST : [platform];

    const campaigns = Array.from({ length: count }).map((_, i) => ({
      campaignName: `${CAMPAIGN_NAMES[Math.floor(Math.random() * CAMPAIGN_NAMES.length)]}_${i + 1}`,
      media: availablePlatforms[Math.floor(Math.random() * availablePlatforms.length)],
      group: `AD_GROUP_${i + 1}`,
      creative: `소재_${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
      baseCost: Math.floor(Math.random() * 250000) + 50000, 
      baseCpm: Math.floor(Math.random() * 15000) + 5000, 
      baseCtr: 0.01 + Math.random() * 0.04, 
      baseCvr: 0.02 + Math.random() * 0.08, 
      baseAov: Math.floor(Math.random() * 70000) + 30000, 
    }));

    const newItems: AdData[] = [];
    const days = ['일', '월', '화', '수', '목', '금', '토'];

    for (let time = start; time <= end; time += 24 * 60 * 60 * 1000) {
      const currentDate = new Date(time);
      const dateStr = currentDate.toISOString().split('T')[0];
      const monthStr = (currentDate.getMonth() + 1).toString();
      const dayOfWeekStr = days[currentDate.getDay()];

      campaigns.forEach(camp => {
        const dailyCost = Math.floor(camp.baseCost * (0.8 + Math.random() * 0.4));
        const dailyCpm = camp.baseCpm * (0.9 + Math.random() * 0.2);
        const dailyCtr = camp.baseCtr * (0.9 + Math.random() * 0.2);
        const dailyCvr = camp.baseCvr * (0.9 + Math.random() * 0.2);
        const dailyAov = camp.baseAov * (0.9 + Math.random() * 0.2);

        // 기본 메트릭 계산
        const dailyImpressions = Math.floor((dailyCost / dailyCpm) * 1000); 
        const dailyClicks = Math.floor(dailyImpressions * dailyCtr); 
        const dailyConversions = Math.floor(dailyClicks * dailyCvr); 
        const dailyRevenue = Math.floor(dailyConversions * dailyAov); 

        // 🌟 4. DB에 들어갈 0.00을 채우기 위해 비율 및 단가 지표 완벽 계산!
        const ctr = dailyImpressions > 0 ? (dailyClicks / dailyImpressions) * 100 : 0;
        const cpc = dailyClicks > 0 ? dailyCost / dailyClicks : 0;
        const cpm = dailyImpressions > 0 ? (dailyCost / dailyImpressions) * 1000 : 0;
        const cvr = dailyClicks > 0 ? (dailyConversions / dailyClicks) * 100 : 0;
        const cpa = dailyConversions > 0 ? dailyCost / dailyConversions : 0;
        const roas = dailyCost > 0 ? (dailyRevenue / dailyCost) * 100 : 0;
        const roi = dailyCost > 0 ? ((dailyRevenue - dailyCost) / dailyCost) * 100 : 0;

        newItems.push({
          id: generateId(),
          date: dateStr,
          month: monthStr,
          dayOfWeek: dayOfWeekStr,
          media: camp.media,
          campaign: camp.campaignName,
          group: camp.group,
          creative: camp.creative,
          cost: dailyCost,
          impressions: dailyImpressions,
          clicks: dailyClicks,
          conversions: dailyConversions,
          revenue: dailyRevenue,
          ctr, cpc, cpm, cvr, cpa, roas, roi
        });
      });
    }

    newItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setData([...newItems, ...data]);
  };

  const getCsvString = () => {
    // 🌟 5. 백엔드가 이름으로 매핑할 수 있도록 DB 컬럼명을 그대로 CSV 헤더에 노출합니다!
    const headers = ['날짜', '월', '요일', '매체', '캠페인', '그룹', '소재', 'cost', 'impressions', 'clicks', 'conversions', 'revenue', 'ctr', 'cpc', 'cpm', 'conversion_rate', 'cpa', 'roas', 'roi'];
    const csvRows = [headers.join(',')];

    data.forEach((item: AdData) => {
        const row = [
            item.date,
            item.month,
            item.dayOfWeek,
            item.media,
            `"${item.campaign}"`,
            `"${item.group}"`,
            `"${item.creative}"`,
            item.cost,
            item.impressions,
            item.clicks,
            item.conversions,
            item.revenue,
            item.ctr.toFixed(2),
            item.cpc.toFixed(2),
            item.cpm.toFixed(2),
            item.cvr.toFixed(2), // DB의 conversion_rate 에 매핑
            item.cpa.toFixed(2),
            item.roas.toFixed(2),
            item.roi.toFixed(2)
        ];
        csvRows.push(row.join(','));
    });
    return "\uFEFF" + csvRows.join('\n');
  };

  const handleExportCSV = () => {
    if (data.length === 0) return alert('내보낼 데이터가 없습니다.');
    const csvContent = getCsvString();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dummy_data_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDB = async () => { /* 기존 코드 유지 */
    if (!token) return alert('로그인이 필요합니다.');
    setIsExportingDB(true);
    try {
        const response = await integrationAPI.exportCSV();
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `channel_ai_db_export_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err: any) {
        console.error(err);
        alert('DB 데이터 추출에 실패했습니다.');
    } finally {
        setIsExportingDB(false);
    }
  };

  const handleSaveToDB = async () => { /* 기존 코드 유지 */
    if (data.length === 0) return alert('저장할 데이터가 없습니다.');
    if (!token) return alert('로그인이 필요합니다.');
    if (!confirm(`${data.length}건의 데이터를 DB에 저장하시겠습니까?`)) return;

    setIsSaving(true);
    try {
        const csvContent = getCsvString();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const file = new File([blob], 'dummy_upload.csv', { type: 'text/csv' });
        
        const response = await integrationAPI.uploadCSV(file);
        if (response.data.success) {
            alert(`✅ 성공: ${response.data.message}`);
        }
    } catch (err: any) {
        console.error(err);
        alert(`❌ 저장 실패: ${err.response?.data?.error || err.response?.data?.message || err.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateObj = new Date(formData.date || '');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    
    const cost = Number(formData.cost) || 0;
    const impressions = Number(formData.impressions) || 0;
    const clicks = Number(formData.clicks) || 0;
    const conversions = Number(formData.conversions) || 0;
    const revenue = Number(formData.revenue) || 0;

    const newRow: AdData = {
        id: editingRow ? editingRow.id : generateId(),
        date: formData.date || '',
        month: (dateObj.getMonth() + 1).toString(),
        dayOfWeek: days[dateObj.getDay()],
        media: formData.media || '',
        campaign: formData.campaign || '',
        group: formData.group || '',
        creative: formData.creative || '',
        cost, impressions, clicks, conversions, revenue,
        // 수기 입력 시에도 비율 지표를 자동 계산해줍니다!
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? cost / clicks : 0,
        cpm: impressions > 0 ? (cost / impressions) * 1000 : 0,
        cvr: clicks > 0 ? (conversions / clicks) * 100 : 0,
        cpa: conversions > 0 ? cost / conversions : 0,
        roas: cost > 0 ? (revenue / cost) * 100 : 0,
        roi: cost > 0 ? ((revenue - cost) / cost) * 100 : 0,
    };

    if (editingRow) {
        setData(data.map((item: AdData) => item.id === editingRow.id ? newRow : item));
    } else {
        setData([newRow, ...data]);
    }
    
    setIsModalOpen(false);
    setEditingRow(null);
    setFormData({ date: new Date().toISOString().split('T')[0], media: 'meta', cost: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
  };

  const clearData = () => { if (confirm('모든 데이터를 삭제하시겠습니까?')) setData([]); };

  const getCampaignSummary = () => {
    const summaryMap = new Map();
    data.forEach(item => {
      if (!summaryMap.has(item.campaign)) {
        summaryMap.set(item.campaign, {
          campaign: item.campaign, media: item.media, group: item.group,
          startDate: item.date, endDate: item.date,
          cost: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0,
        });
      }
      const summary = summaryMap.get(item.campaign);
      summary.cost += item.cost;
      summary.impressions += item.impressions;
      summary.clicks += item.clicks;
      summary.conversions += item.conversions;
      summary.revenue += item.revenue;
      
      if (item.date < summary.startDate) summary.startDate = item.date;
      if (item.date > summary.endDate) summary.endDate = item.date;
    });
    return Array.from(summaryMap.values());
  };

  const aggregatedData = getCampaignSummary();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">테스트 데이터 생성 센터</h1>
            <p className="text-gray-500 text-sm mt-1 mb-3">분석 및 테스트를 위한 더미 데이터를 생성하거나 직접 입력하여 DB에 업로드하세요.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link to="/advanced-model-test" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-xl font-bold transition">
                <Brain size={18} />
                AI 고급 모델 평가 지표 보기
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link 
              to="/data-management"
              className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-100 transition flex items-center gap-2"
            >
              <Database size={18} />
              DB 데이터 관리
            </Link>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition flex items-center gap-2"
            >
              <Plus size={18} />
              수기 입력

            </button>
            <button onClick={handleSaveToDB} disabled={isSaving || data.length === 0} className={`px-4 py-2 text-white rounded-xl font-medium transition flex items-center gap-2 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}>
              {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Database size={18} />}
              {isSaving ? '저장 중...' : 'DB에 직접 저장'}
            </button>
            <button onClick={clearData} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition">전체 비우기</button>
          </div>
        </div>

        {/* Dummy Generation Config */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" size={24} />
                랜덤 데이터 생성 설정
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                {/* 🌟 플랫폼 선택 드롭다운 추가 */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">매체 선택</label>
                    <select 
                        value={genConfig.platform}
                        onChange={(e) => setGenConfig({...genConfig, platform: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="all">전체 (랜덤 배정)</option>
                        {MEDIA_LIST.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">시작일</label>
                    <input type="date" value={genConfig.startDate} onChange={(e) => setGenConfig({...genConfig, startDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">종료일</label>
                    <input type="date" value={genConfig.endDate} onChange={(e) => setGenConfig({...genConfig, endDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">캠페인 수</label>
                    <input type="number" value={genConfig.count} onChange={(e) => setGenConfig({...genConfig, count: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" min="1" max="1000" />
                </div>
                <button onClick={handleGenerateDummy} className="px-6 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold hover:bg-blue-100 transition whitespace-nowrap h-[42px]">
                  랜덤 생성
                </button>
            </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="px-6 py-4">진행 기간</th>
                  <th className="px-6 py-4">매체</th>
                  <th className="px-6 py-4">캠페인 / 그룹</th>
                  <th className="px-6 py-4 text-right">총 비용 / 수익</th>
                  <th className="px-6 py-4 text-right">총 노출 / 클릭</th>
                  <th className="px-6 py-4 text-right">총 전환수</th>
                  <th className="px-6 py-4 text-center">캠페인 삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {aggregatedData.length > 0 ? (
                  aggregatedData.map((item: any, index: number) => {
                    const roas = item.cost > 0 ? ((item.revenue / item.cost) * 100).toFixed(0) : 0;
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.startDate}</div>
                          <div className="text-xs text-gray-500">~ {item.endDate}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                            {item.media.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900 font-medium truncate max-w-[200px]">{item.campaign}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.group}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-medium text-gray-900">비용: ₩{item.cost.toLocaleString()}</div>
                          <div className="text-blue-600 font-bold">수익: ₩{item.revenue.toLocaleString()}</div>
                          <div className="text-xs text-green-600 font-semibold mt-1">ROAS: {roas}%</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-gray-900">{item.impressions.toLocaleString()} 노출</div>
                          <div className="text-xs text-gray-500">{item.clicks.toLocaleString()} 클릭</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-purple-600 font-bold">{item.conversions.toLocaleString()}회</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => { if (confirm(`삭제하시겠습니까?`)) setData(data.filter(d => d.campaign !== item.campaign)); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition">
                              <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center">
                        <AlertCircle size={48} className="mb-2 opacity-20" />
                        <p className="text-lg font-medium">데이터가 없습니다</p>
                        <p className="text-sm">랜덤 생성을 하거나 수기로 입력해주세요.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DummyDataPage;