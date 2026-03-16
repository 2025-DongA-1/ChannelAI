// [2026-03-11 11:12] CSV 업로드 기능 추가를 위해 useRef, UploadCloud, integrationAPI 추가
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metricAPI, integrationAPI } from '../lib/api';
import { RefreshCw, Search, Trash2, Edit2, X, Check, UploadCloud, Database, Download } from 'lucide-react';

export default function DataManagementPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // [2026-03-11 11:12] CSV 업로드 기능 추가
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await integrationAPI.uploadCSV(file);
      alert('CSV 업로드가 완료되었습니다!');
      queryClient.invalidateQueries({ queryKey: ['metrics-all'] });
    } catch (err: any) {
      alert(err?.response?.data?.error || 'CSV 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  // 체크박스 선택 및 수정 상태 관리
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // 메트릭 데이터 조회
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['metrics-all'],
    queryFn: () => metricAPI.getAllMetrics(),
  });

  const metrics = data?.data?.metrics || [];

  // 검색 필터 적용
  const filteredMetrics = metrics.filter((m: any) => 
    (m.campaign_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.platform || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 수정 뮤테이션
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => metricAPI.updateMetric(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics-all'] });
      setEditingId(null);
      alert('성공적으로 수정되었습니다.');
    },
    onError: () => alert('수정에 실패했습니다.')
  });

  // 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: (id: number) => metricAPI.deleteMetric(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics-all'] });
      alert('성공적으로 삭제되었습니다.');
    },
    onError: () => alert('삭제에 실패했습니다.')
  });

  // 복수 삭제 뮤테이션
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => metricAPI.deleteBulkMetrics(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics-all'] });
      setSelectedIds([]); // 삭제 성공 시 선택 초기화
      alert('선택한 데이터가 성공적으로 삭제되었습니다.');
    },
    onError: () => alert('일괄 삭제에 실패했습니다.')
  });

  // 일괄 삭제 핸들러
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`정말 선택한 ${selectedIds.length}개의 데이터를 한 번에 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  // 전체 선택 트리거
  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.checked) {
      setSelectedIds(filteredMetrics.map((m: any) => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 단일 선택 트리거
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 편집 시작
  const startEditing = (m: any) => {
    setEditingId(m.id);
    setEditForm({
      impressions: m.impressions,
      clicks: m.clicks,
      cost: m.cost,
      conversions: m.conversions,
      revenue: m.revenue,
    });
  };

  // 편집 취소
  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  // 저장 처리
  const handleSave = (id: number) => {
    updateMutation.mutate({
      id, 
      data: {
        impressions: Number(editForm.impressions || 0),
        clicks: Number(editForm.clicks || 0),
        cost: Number(editForm.cost || 0),
        conversions: Number(editForm.conversions || 0),
        revenue: Number(editForm.revenue || 0),
      }
    });
  };

  // 삭제 처리
  const handleDelete = (id: number) => {
    if(window.confirm('정말 해당 데이터(행)를 삭제하시겠습니까?\n복구할 수 없습니다.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          {/* [2026-03-11 11:12] 페이지 이름 '데이터 관리'로 변경, 테스트 데이터 생성 센터 버튼 제거, CSV 업로드 추가 */}
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-8 h-8 text-blue-600" />
            데이터 관리
          </h1>
          <p className="text-gray-600 mt-1">DB에 적재된 광고 성과 로우(Raw) 데이터를 직접 확인하고 편집·삭제합니다.</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv" 
            className="hidden" 
          />
          {/* [2026-03-13] 샘플 CSV 양식 다운로드 버튼 추가 */}
          <a
            href="/channel_ai_export.csv"
            download="channel_ai_export.csv"
            className="flex items-center px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-100 transition shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            양식 다운로드
          </a>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl font-medium hover:bg-green-100 transition shadow-sm disabled:opacity-50"
          >
            {isUploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            {isUploading ? '업로드 중...' : 'CSV 업로드'}
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center px-4 py-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-center relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="캠페인명 또는 플랫폼 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold hover:bg-red-100 transition whitespace-nowrap shadow-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              선택 삭제 ({selectedIds.length})
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredMetrics.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            데이터가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      checked={filteredMetrics.length > 0 && selectedIds.length === filteredMetrics.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3">날짜</th>
                  <th className="px-4 py-3">플랫폼</th>
                  <th className="px-4 py-3">캠페인명</th>
                  <th className="px-4 py-3 text-right">노출수</th>
                  <th className="px-4 py-3 text-right">클릭수</th>
                  <th className="px-4 py-3 text-right">비용 (₩)</th>
                  <th className="px-4 py-3 text-right">전환수</th>
                  <th className="px-4 py-3 text-right">수익 (₩)</th>
                  <th className="px-4 py-3 text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMetrics.map((m: any) => (
                  <tr key={m.id} className={`hover:bg-gray-50 transition ${selectedIds.includes(m.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        checked={selectedIds.includes(m.id)}
                        onChange={() => toggleSelect(m.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(m.metric_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                        {m.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium truncate max-w-[200px]">
                      {m.campaign_name}
                    </td>
                    
                    {/* 데이터 입력 및 출력 영역 */}
                    {editingId === m.id ? (
                      <>
                        <td className="px-4 py-2 text-right">
                          <input type="number" className="w-20 px-2 py-1 border rounded" value={editForm.impressions} onChange={e => setEditForm({...editForm, impressions: e.target.value})} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" className="w-20 px-2 py-1 border rounded" value={editForm.clicks} onChange={e => setEditForm({...editForm, clicks: e.target.value})} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" className="w-24 px-2 py-1 border rounded" value={editForm.cost} onChange={e => setEditForm({...editForm, cost: e.target.value})} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" className="w-20 px-2 py-1 border rounded" value={editForm.conversions} onChange={e => setEditForm({...editForm, conversions: e.target.value})} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" className="w-24 px-2 py-1 border rounded" value={editForm.revenue} onChange={e => setEditForm({...editForm, revenue: e.target.value})} />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleSave(m.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded disabled:opacity-50">
                              <Check size={16} />
                            </button>
                            <button onClick={cancelEditing} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded">
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right">{m.impressions?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{m.clicks?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{m.cost?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-purple-600 font-medium">{m.conversions?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-blue-600 font-medium">{m.revenue?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => startEditing(m)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
