import { useEffect, useState } from 'react';
import axios from 'axios';

const adminApi = axios.create({ baseURL: '/api/admin' });

interface DbStatus {
  mode: 'remote' | 'custom';
  config: { host: string; port: number; database: string; user: string } | null;
}

export default function LocalDbPage() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [form, setForm] = useState({
    host: '',
    port: '3306',
    database: '',
    user: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await adminApi.get('/admin/db-status');
      setStatus(res.data);
    } catch {}
  };

  useEffect(() => { fetchStatus(); }, []);

  const connect = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await adminApi.post('/admin/db-switch/custom', {
        ...form,
        port: Number(form.port),
      });
      setMsg({ text: res.data.message, ok: true });
      fetchStatus();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.error || '연결 실패', ok: false });
    } finally {
      setLoading(false);
    }
  };

  const restoreRemote = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await adminApi.post('/admin/db-switch/remote');
      setMsg({ text: res.data.message, ok: true });
      fetchStatus();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.error || '복귀 실패', ok: false });
    } finally {
      setLoading(false);
    }
  };

  const isCustom = status?.mode === 'custom';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: '40px 48px', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>임시 DB 전환</h2>
        <p style={{ color: '#64748b', fontSize: 12, marginBottom: 28 }}>ngrok 등 임시 주소로 DB를 교체합니다</p>

        {/* 현재 상태 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '10px 14px', background: '#0f172a', borderRadius: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isCustom ? '#f59e0b' : '#22c55e', flexShrink: 0 }} />
          <span style={{ color: '#cbd5e1', fontSize: 13 }}>
            {isCustom
              ? `임시 DB 사용 중 — ${status?.config?.host}:${status?.config?.port}`
              : '원래 DB 사용 중 (Remote)'}
          </span>
          <button onClick={fetchStatus} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>↻</button>
        </div>

        {/* 입력 폼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            { label: '호스트', key: 'host', placeholder: '0.tcp.ap.ngrok.io' },
            { label: '포트', key: 'port', placeholder: '12345' },
            { label: 'DB명', key: 'database', placeholder: 'cgi_25K_DA1_p3_1' },
            { label: '유저', key: 'user', placeholder: 'root' },
            { label: '비밀번호', key: 'password', placeholder: '(없으면 비워두기)', type: 'password' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#94a3b8', fontSize: 12, width: 60, flexShrink: 0 }}>{label}</span>
              <input
                type={type || 'text'}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #334155',
                  background: '#0f172a', color: '#f1f5f9', fontSize: 13, outline: 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            onClick={connect}
            disabled={loading || !form.host || !form.port || !form.database || !form.user}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
              background: loading ? '#334155' : '#6366f1', color: '#fff',
              fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '연결 중...' : '임시 DB 연결'}
          </button>
          <button
            onClick={restoreRemote}
            disabled={loading || !isCustom}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
              background: isCustom ? '#0ea5e9' : '#1e3a4a', color: isCustom ? '#fff' : '#475569',
              fontWeight: 600, fontSize: 14, cursor: loading || !isCustom ? 'not-allowed' : 'pointer',
            }}
          >
            원래 DB 복귀
          </button>
        </div>

        {/* 메시지 */}
        {msg && (
          <p style={{ marginTop: 14, fontSize: 13, textAlign: 'center', color: msg.ok ? '#86efac' : '#fca5a5' }}>
            {msg.text}
          </p>
        )}

        {/* 안내 */}
        <div style={{ marginTop: 24, padding: 14, background: '#0f172a', borderRadius: 8, fontSize: 11, color: '#475569', lineHeight: 2 }}>
          <div style={{ color: '#64748b', fontWeight: 600, marginBottom: 4 }}>ngrok 사용법</div>
          <div>1. 개발 PC에서: <code style={{ color: '#94a3b8' }}>ngrok tcp 3306</code></div>
          <div>2. 출력된 주소를 호스트/포트에 입력</div>
          <div>3. 임시 DB 연결 클릭</div>
          <div>4. 원래 DB 복구되면 "원래 DB 복귀" 클릭</div>
        </div>
      </div>
    </div>
  );
}
