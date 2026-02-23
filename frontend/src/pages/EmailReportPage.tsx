import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Mail, Send, Clock, CheckCircle,
  AlertTriangle, RefreshCw, Calendar, Bell,
} from 'lucide-react';
import { api } from '../lib/api';

type SendStatus = 'idle' | 'loading' | 'success' | 'error';

const EmailReportPage: React.FC = () => {
  const [weeklyStatus, setWeeklyStatus] = useState<SendStatus>('idle');
  const [dailyStatus,  setDailyStatus]  = useState<SendStatus>('idle');
  const [testStatus,   setTestStatus]   = useState<SendStatus>('idle');
  const [message, setMessage] = useState<string>('');

  // ── 발송 핸들러 ──────────────────────────────────────────────────────────
  const handleSend = async (
    type: 'weekly' | 'daily' | 'test',
    setStatus: (s: SendStatus) => void
  ) => {
    setStatus('loading');
    setMessage('');
    try {
      const res = await api.post(`/report/${type}`);
      setMessage(res.data.message || '발송 요청 완료!');
      setStatus('success');
    } catch (err: any) {
      setMessage(err?.response?.data?.message || '발송 실패. 이메일 서버 설정을 확인하세요.');
      setStatus('error');
    }
    // 5초 후 idle 복귀
    setTimeout(() => setStatus('idle'), 5000);
  };

  // ── 버튼 스타일 ───────────────────────────────────────────────────────────
  const btnClass = (status: SendStatus, color: string) => {
    const base = 'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50';
    if (status === 'loading') return `${base} bg-gray-200 text-gray-500 cursor-not-allowed`;
    if (status === 'success') return `${base} bg-green-100 text-green-700`;
    if (status === 'error')   return `${base} bg-red-100 text-red-700`;
    return `${base} bg-${color}-600 text-white hover:bg-${color}-700`;
  };

  const btnIcon = (status: SendStatus) => {
    if (status === 'loading') return <RefreshCw size={16} className="animate-spin" />;
    if (status === 'success') return <CheckCircle size={16} />;
    if (status === 'error')   return <AlertTriangle size={16} />;
    return <Send size={16} />;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* 헤더 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <Link to="/dummy" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={22} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="text-blue-600" /> 이메일 리포트 설정
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              사용자에게 광고 성과 리포트를 이메일로 발송합니다.
            </p>
          </div>
        </div>

        {/* 상태 메시지 */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-medium ${
            [weeklyStatus, dailyStatus, testStatus].includes('error')
              ? 'bg-red-50 text-red-700 border border-red-100'
              : 'bg-green-50 text-green-700 border border-green-100'
          }`}>
            {[weeklyStatus, dailyStatus, testStatus].includes('error')
              ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            {message}
          </div>
        )}

        {/* 발송 카드 목록 */}
        {[
          {
            icon: <Calendar className="text-blue-500" size={22} />,
            title: '주간 리포트 발송',
            desc: '지난 7일간의 광고 성과를 모든 사용자 이메일로 발송합니다.',
            schedule: '자동 발송: 매주 월요일 오전 9시',
            color: 'blue',
            status: weeklyStatus,
            setStatus: setWeeklyStatus,
            type: 'weekly' as const,
          },
          {
            icon: <Bell className="text-purple-500" size={22} />,
            title: '일간 리포트 발송',
            desc: '어제 하루 광고 성과를 모든 사용자 이메일로 발송합니다.',
            schedule: '자동 발송: ENABLE_DAILY_REPORT=true 설정 시 매일 오전 9시',
            color: 'purple',
            status: dailyStatus,
            setStatus: setDailyStatus,
            type: 'daily' as const,
          },
          {
            icon: <Mail className="text-green-500" size={22} />,
            title: '테스트 발송',
            desc: '지금 즉시 주간 리포트를 내 계정 이메일로 테스트 발송합니다.',
            schedule: '수동 발송 전용 (자동 스케줄 없음)',
            color: 'green',
            status: testStatus,
            setStatus: setTestStatus,
            type: 'test' as const,
          },
        ].map((card) => (
          <div key={card.type} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">{card.icon}</div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{card.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                    <Clock size={12} />
                    {card.schedule}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleSend(card.type, card.setStatus)}
                disabled={card.status === 'loading'}
                className={btnClass(card.status, card.color)}
              >
                {btnIcon(card.status)}
                {card.status === 'loading' ? '발송 중...' :
                  card.status === 'success' ? '발송 완료' :
                  card.status === 'error'   ? '실패' : '지금 발송'}
              </button>
            </div>
          </div>
        ))}

        {/* Gmail 설정 가이드 */}
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl space-y-3">
          <h3 className="font-bold text-blue-800 flex items-center gap-2">
            ⚙️ Gmail 앱 비밀번호 설정 방법
          </h3>
          <ol className="text-sm text-blue-700 space-y-1.5 list-decimal list-inside">
            <li>Google 계정 → <strong>보안</strong> 탭 이동</li>
            <li><strong>2단계 인증</strong> 활성화 (필수)</li>
            <li><strong>앱 비밀번호</strong> 클릭 → "메일" 선택 → 16자리 비밀번호 생성</li>
            <li>생성된 비밀번호를 <code className="bg-blue-100 px-1 rounded">backend/.env</code>의 <code className="bg-blue-100 px-1 rounded">SMTP_PASS</code>에 입력</li>
            <li><code className="bg-blue-100 px-1 rounded">SMTP_USER</code>에는 Gmail 주소 입력</li>
          </ol>
          <div className="bg-white border border-blue-200 rounded-xl p-3 text-xs font-mono text-gray-700 space-y-0.5">
            <div>SMTP_HOST=smtp.gmail.com</div>
            <div>SMTP_PORT=587</div>
            <div className="text-blue-600">SMTP_USER=your-email@gmail.com</div>
            <div className="text-blue-600">SMTP_PASS=abcd efgh ijkl mnop  ← 앱 비밀번호</div>
            <div>ENABLE_DAILY_REPORT=false  ← true 로 바꾸면 일간도 자동 발송</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmailReportPage;
