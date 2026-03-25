import { useState, useEffect } from 'react';
import axios from 'axios';

const API = '/api/admin';

interface DbStatus {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  isCustom: boolean;
  error?: string;
}

export default function LocalDbPage() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306');
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('ad_mate_db');
  const [key, setKey] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API}/db-status`);
      setStatus(res.data);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSwitch = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await axios.post(`${API}/switch-db`, { host, port, user, password, database, key });
      setMsg(`✅ ${res.data.message}`);
      fetchStatus();
    } catch (err: any) {
      setMsg(`❌ ${err.response?.data?.error || '연결 실패'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await axios.post(`${API}/restore-db`, { key });
      setMsg(`✅ ${res.data.message}`);
      fetchStatus();
    } catch (err: any) {
      setMsg(`❌ ${err.response?.data?.error || '복원 실패'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">긴급 DB 전환</h1>
          <p className="text-sm text-gray-500 mt-1">원격 DB 장애 시 로컬 DB로 임시 전환합니다</p>
        </div>

        {/* 현재 상태 */}
        <div className="bg-white rounded-xl border p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700">현재 DB 상태</p>
          {status ? (
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={status.connected ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                  {status.connected ? '연결됨' : '연결 실패'}
                </span>
                {status.isCustom && (
                  <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full font-medium">로컬 DB 사용 중</span>
                )}
              </div>
              <p className="text-gray-600">{status.host}:{status.port} / {status.database}</p>
              {status.error && <p className="text-red-500 text-xs">{status.error}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-400">상태 조회 중...</p>
          )}
          <button onClick={fetchStatus} className="text-xs text-blue-600 hover:underline">새로고침</button>
        </div>

        {/* pinggy 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
          <p className="font-semibold">로컬 MySQL 터널링 방법 (pinggy)</p>
          <p>로컬 PC 터미널에서 아래 명령어 실행:</p>
          <code className="block bg-blue-100 px-3 py-2 rounded text-xs font-mono break-all">
            ssh -p 443 -R0:localhost:3306 tcp@a.pinggy.io
          </code>
          <p>출력된 주소(예: <span className="font-mono">oaqjt-xxx.a.free.pinggy.link:33101</span>)를 아래 host/port에 입력하세요.</p>
          <p className="text-xs text-blue-600">※ 무료 플랜 60분 제한</p>
        </div>

        {/* 전환 폼 */}
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">로컬 DB 연결 정보</p>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-gray-500">Host</label>
              <input value={host} onChange={e => setHost(e.target.value)}
                placeholder="oaqjt-xxx.a.free.pinggy.link"
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Port</label>
              <input value={port} onChange={e => setPort(e.target.value)}
                placeholder="33101"
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">User</label>
              <input value={user} onChange={e => setUser(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Database</label>
            <input value={database} onChange={e => setDatabase(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-xs text-gray-500">인증 키</label>
            <input value={key} onChange={e => setKey(e.target.value)}
              type="password"
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {msg && (
            <p className={`text-sm font-medium ${msg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={handleSwitch} disabled={loading || !host}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition">
              {loading ? '처리 중...' : '로컬 DB로 전환'}
            </button>
            <button onClick={handleRestore} disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? '처리 중...' : '원격 DB로 복원'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
