import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { integrationAPI } from '../lib/api';
import { FileSpreadsheet, Plus, Download, Database, Trash2, AlertCircle, RefreshCw, Brain, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  views: number;
  installs: number;
  leads: number;
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
  
  // New row form state
  const [formData, setFormData] = useState<Partial<AdData>>({
    date: new Date().toISOString().split('T')[0],
    media: '카카오',
    cost: 0,
    impressions: 0,
    clicks: 0,
    views: 0,
    installs: 0,
    leads: 0,
  });

  // Dummy generation config
  const [genConfig, setGenConfig] = useState({
    // 👇 365를 30(1달)로 가볍게 줄여줍니다!
    startDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    count: 1,
  });

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleGenerateDummy = () => {
    const { startDate, endDate, count } = genConfig;
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const range = end - start;

    if (range < 0) return alert('시작일이 종료일보다 늦을 수 없습니다.');

    const campaigns = Array.from({ length: count }).map((_, i) => ({
      campaignName: `${CAMPAIGN_NAMES[Math.floor(Math.random() * CAMPAIGN_NAMES.length)]}_${i + 1}`,
      media: MEDIA_LIST[Math.floor(Math.random() * MEDIA_LIST.length)],
      group: `AD_GROUP_${i + 1}`,
      baseCost: Math.floor(Math.random() * 250000) + 50000, 
      creative: `소재_${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
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
        const dailyImpressions = Math.floor(dailyCost / (15 + Math.random() * 10)); 
        const dailyClicks = Math.floor(dailyImpressions * (0.01 + Math.random() * 0.04)); 
        const dailyConversions = Math.floor(dailyClicks * (0.05 + Math.random() * 0.1)); 

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
          views: Math.floor(dailyImpressions * 0.4),
          installs: Math.floor(dailyConversions * 0.7),
          leads: Math.floor(dailyConversions * 0.3),
        });
      });
    }

    newItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setData([...newItems, ...data]);
  };

  const getCsvString = () => {
    const headers = ['날짜', '월', '요일', '매체', '캠페인', '그룹', '소재', '비용', '노출', '클릭', '조회', '설치', '잠재고객'];
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
            item.views,
            item.installs,
            item.leads
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

  const handleExportDB = async () => {
    if (!token) return alert('로그인이 필요합니다.');
    
    setIsExportingDB(true);
    try {
        const response = await integrationAPI.exportCSV();
        // blob response processing
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

  const handleSaveToDB = async () => {
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
    
    const newRow: AdData = {
        id: editingRow ? editingRow.id : generateId(),
        date: formData.date || '',
        month: (dateObj.getMonth() + 1).toString(),
        dayOfWeek: days[dateObj.getDay()],
        media: formData.media || '',
        campaign: formData.campaign || '',
        group: formData.group || '',
        creative: formData.creative || '',
        cost: Number(formData.cost) || 0,
        impressions: Number(formData.impressions) || 0,
        clicks: Number(formData.clicks) || 0,
        views: Number(formData.views) || 0,
        installs: Number(formData.installs) || 0,
        leads: Number(formData.leads) || 0,
    };

    if (editingRow) {
        setData(data.map((item: AdData) => item.id === editingRow.id ? newRow : item));
    } else {
        setData([newRow, ...data]);
    }
    
    setIsModalOpen(false);
    setEditingRow(null);
    setFormData({
        date: new Date().toISOString().split('T')[0],
        media: '카카오',
        cost: 0,
        impressions: 0,
        clicks: 0,
        views: 0,
        installs: 0,
        leads: 0,
    });
  };

  // 사용하지 않은 함수라 일단 주석처리   
  /*
  const handleDelete = (id: string) => {
    if (confirm('삭제하시겠습니까?')) {
        setData(data.filter(item => item.id !== id));
    }
  };
  */

  const clearData = () => {
    if (confirm('모든 데이터를 삭제하시겠습니까?')) {
        setData([]);
    }
  };

  // 👇 요기에 합치기 계산 로직 추가! 👇
  const getCampaignSummary = () => {
    const summaryMap = new Map();
    data.forEach(item => {
      if (!summaryMap.has(item.campaign)) {
        summaryMap.set(item.campaign, {
          campaign: item.campaign,
          media: item.media,
          group: item.group,
          startDate: item.date,
          endDate: item.date,
          cost: 0,
          impressions: 0,
          clicks: 0,
          installs: 0,
          leads: 0,
        });
      }
      const summary = summaryMap.get(item.campaign);
      // 비용과 성과를 하나로 다 더해줍니다!
      summary.cost += item.cost;
      summary.impressions += item.impressions;
      summary.clicks += item.clicks;
      summary.installs += item.installs;
      summary.leads += item.leads;
      // 시작일과 종료일을 찾아줍니다!
      if (item.date < summary.startDate) summary.startDate = item.date;
      if (item.date > summary.endDate) summary.endDate = item.date;
    });
    return Array.from(summaryMap.values());
  };

  const aggregatedData = getCampaignSummary();
  // 👆 추가 완료 👆

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
              <Link to="/email-report" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl font-bold transition">
                <Mail size={18} />
                이메일 리포트 설정
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
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition flex items-center gap-2"
            >
              <Download size={18} />
              작성데이터 다운로드
            </button>
            <button 
              onClick={handleExportDB}
              disabled={isExportingDB}
              className={`px-4 py-2 border border-blue-200 rounded-xl font-medium transition flex items-center gap-2 ${
                isExportingDB ? 'bg-blue-50 text-blue-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm'
              }`}
            >
              <Database size={18} />
              {isExportingDB ? '추출 중...' : 'DB 성과 다운로드'}
            </button>
            <button 
              onClick={handleSaveToDB}
              disabled={isSaving || data.length === 0}
              className={`px-4 py-2 text-white rounded-xl font-medium transition flex items-center gap-2 ${
                isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
              }`}
            >
              {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Database size={18} />}
              {isSaving ? '저장 중...' : 'DB에 직접 저장'}
            </button>
            <button 
              onClick={clearData}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition"
            >
              전체 비우기
            </button>
          </div>
        </div>

        {/* Dummy Generation Config */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" size={24} />
                랜덤 데이터 생성 설정
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">시작일</label>
                    <input 
                        type="date" 
                        value={genConfig.startDate}
                        onChange={(e) => setGenConfig({...genConfig, startDate: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">종료일</label>
                    <input 
                        type="date" 
                        value={genConfig.endDate}
                        onChange={(e) => setGenConfig({...genConfig, endDate: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">생성할 캠페인 수</label>
                    <input 
                        type="number" 
                        value={genConfig.count}
                        onChange={(e) => setGenConfig({...genConfig, count: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        min="1"
                        max="1000"
                    />
                </div>
                <button 
                  onClick={handleGenerateDummy}
                  className="px-6 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold hover:bg-blue-100 transition whitespace-nowrap"
                >
                  랜덤 데이터 생성하기
                </button>
            </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                <tr>
                  {/* 👇 제목들이 캠페인 요약에 맞게 바뀌었어요! */}
                  <th className="px-6 py-4">진행 기간</th>
                  <th className="px-6 py-4">매체</th>
                  <th className="px-6 py-4">캠페인 / 그룹</th>
                  <th className="px-6 py-4 text-right">총 비용</th>
                  <th className="px-6 py-4 text-right">총 노출/클릭</th>
                  <th className="px-6 py-4 text-right">총 전환(설치/잠재)</th>
                  <th className="px-6 py-4 text-center">캠페인 삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {aggregatedData.length > 0 ? (
                  // 👇 data 대신 위에서 합쳐둔 aggregatedData를 씁니다!
                  aggregatedData.map((item: any, index: number) => (
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
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        ₩{item.cost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-gray-900">{item.impressions.toLocaleString()} 노출</div>
                        <div className="text-xs text-gray-500">{item.clicks.toLocaleString()} 클릭</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-blue-600 font-bold">{item.installs.toLocaleString()} 설치</div>
                        <div className="text-xs text-gray-500">{item.leads.toLocaleString()} 잠재</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-1">
                            <button 
                                onClick={() => {
                                    if (confirm(`'${item.campaign}' 캠페인의 모든 일자 데이터를 삭제하시겠습니까?`)) {
                                        // 캠페인 단위로 묶여있으니, 삭제할 때 해당 캠페인 이름의 데이터를 통째로 지워줍니다!
                                        setData(data.filter(d => d.campaign !== item.campaign));
                                    }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition"
                                title="캠페인 삭제"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))
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

      {/* Manual Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRow ? '데이터 수정' : '데이터 직접 입력'}
              </h2>
              <button 
                onClick={() => {
                    setIsModalOpen(false);
                    setEditingRow(null);
                }}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">날짜</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">매체</label>
                  <select 
                    value={formData.media}
                    onChange={(e) => setFormData({...formData, media: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  >
                    {MEDIA_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">캠페인명</label>
                  <input 
                    type="text" 
                    value={formData.campaign}
                    onChange={(e) => setFormData({...formData, campaign: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="캠페인 이름"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">광고그룹</label>
                  <input 
                    type="text" 
                    value={formData.group}
                    onChange={(e) => setFormData({...formData, group: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="그룹 이름"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">비용</label>
                  <input 
                    type="number" 
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">노출수</label>
                  <input 
                    type="number" 
                    value={formData.impressions}
                    onChange={(e) => setFormData({...formData, impressions: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">클릭수</label>
                  <input 
                    type="number" 
                    value={formData.clicks}
                    onChange={(e) => setFormData({...formData, clicks: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">설치수</label>
                  <input 
                    type="number" 
                    value={formData.installs}
                    onChange={(e) => setFormData({...formData, installs: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition"
                >
                  {editingRow ? '수정 완료' : '추가하기'}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                      setIsModalOpen(false);
                      setEditingRow(null);
                  }}
                  className="px-8 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DummyDataPage;
