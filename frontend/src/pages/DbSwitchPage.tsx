import { useEffect, useState } from 'react';
import api from '../utils/api';

type DbMode = 'remote' | 'local';

export default function DbSwitchPage() {
  const [mode, setMode] = useState<DbMode>('remote');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 현재 서버 DB 상태 조회
  const fetchStatus = async () => {
    try {
      const res = await api.get('/admin/db-status');
      setMode(res.data.mode);
      setConnected(res.data.connected);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // 브라우저 닫힐 때 remote로 자동 복귀
    const handleUnload = () => {
      navigator.sendBeacon('/api/admin/db-switch', JSON.stringify({ mode: 'remote' }));
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const switchMode = async (target: DbMode) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post('/admin/db-switch', { mode: target });
      setMode(res.data.mode);
      setConnected(res.data.connected);
      setMessage(res.data.message || res.data.error || '');
    } catch (err: any) {
      setMessage(err.response?.data?.error || '전환 실패');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = connected === true ? '#22c55e' : connected === false ? '#ef4444' : '#94a3b8';
  const statusText  = connected === true ? '연결됨' : connected === false ? '연결 실패' : '확인 중...';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: '40px 48px', minWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>DB 전환</h2>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 32 }}>개발용 — 브라우저 닫으면 자동으로 Remote 복귀</p>

        {/* 상태 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor }} />
          <span style={{ color: '#cbd5e1', fontSize: 14 }}>
            현재: <strong style={{ color: '#f1f5f9' }}>{mode.toUpperCase()}</strong> — {statusText}
          </span>
          <button
            onClick={fetchStatus}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}
            title="새로고침"
          >↻</button>
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {(['remote', 'local'] as DbMode[]).map(target => (
            <button
              key={target}
              onClick={() => switchMode(target)}
              disabled={loading || mode === target}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 10,
                border: 'none',
                fontWeight: 600,
                fontSize: 15,
                cursor: loading || mode === target ? 'not-allowed' : 'pointer',
                background: mode === target ? (target === 'local' ? '#6366f1' : '#0ea5e9') : '#334155',
                color: mode === target ? '#fff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              {loading && mode !== target ? '전환 중...' : target.toUpperCase()}
            </button>
          ))}
        </div>

        {/* 메시지 */}
        {message && (
          <p style={{ color: connected ? '#86efac' : '#fca5a5', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            {message}
          </p>
        )}

        {/* 로컬 DB 설정 안내 */}
        <div style={{ marginTop: 28, padding: 16, background: '#0f172a', borderRadius: 10, fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
          <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>.env 로컬 설정 (선택)</div>
          <div>LOCAL_DB_HOST=localhost</div>
          <div>LOCAL_DB_PORT=3306</div>
          <div>LOCAL_DB_NAME=ad_mate_db</div>
          <div>LOCAL_DB_USER=root</div>
          <div>LOCAL_DB_PASSWORD=1234</div>
        </div>
      </div>
    </div>
  );
}
