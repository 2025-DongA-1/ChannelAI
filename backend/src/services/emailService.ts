/**
 * emailService.ts
 * 이메일 발송 서비스
 *
 * 우선순위:
 *   1. RESEND_API_KEY 설정됨 → Resend API로 발송 (추천)
 *   2. SMTP_USER 설정됨 → Gmail SMTP 발송
 *   3. 둘 다 없음 → Ethereal 테스트 모드 (미리보기 URL)
 */
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// ── 전역 상태 ─────────────────────────────────────────────────────────────
let mode: 'resend' | 'smtp' | 'ethereal' | 'disabled' = 'disabled';
let resendClient: Resend | null = null;
let transporter: nodemailer.Transporter | null = null;

/** 이메일 서비스 초기화 (서버 시작 시 1회 호출) */
export const verifyEmailConnection = async (): Promise<boolean> => {
  // ── 1순위: Resend ──────────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && !resendKey.includes('your-')) {
    resendClient = new Resend(resendKey);
    mode = 'resend';
    console.log('');
    console.log('📧 ═══════════════════════════════════════════════');
    console.log('📧  Resend 이메일 서비스 활성화');
    console.log('📧  발신: onboarding@resend.dev (무료 기본 주소)');
    console.log('📧 ═══════════════════════════════════════════════');
    console.log('');
    return true;
  }

  // ── 2순위: Gmail SMTP ──────────────────────────────────────────────────
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass && !smtpUser.includes('your-')) {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.verify();
      mode = 'smtp';
      console.log('✅ 이메일 서버 연결 성공 (Gmail SMTP)');
      return true;
    } catch (err) {
      console.error('❌ Gmail SMTP 연결 실패:', err);
    }
  }

  // ── 3순위: Ethereal 테스트 모드 ─────────────────────────────────────────
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    mode = 'ethereal';
    console.log('');
    console.log('📧 ═══════════════════════════════════════════════');
    console.log('📧  Ethereal 테스트 메일 모드 활성화');
    console.log('📧  실제 메일은 발송되지 않습니다.');
    console.log('📧  발송 후 콘솔의 미리보기 URL을 확인하세요.');
    console.log('📧 ═══════════════════════════════════════════════');
    console.log('');
    return true;
  } catch (err) {
    console.error('❌ Ethereal 생성 실패:', err);
    mode = 'disabled';
    return false;
  }
};

/** 이메일 전송 함수 */
export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  // ── Resend API ─────────────────────────────────────────────────────────
  if (mode === 'resend' && resendClient) {
    const { error } = await resendClient.emails.send({
      from: 'ChannelAI <onboarding@resend.dev>',   // Resend 무료 기본 발신자
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error(`  ❌ Resend 발송 실패 (${to}):`, error);
      throw new Error(error.message);
    }
    console.log(`  ✅ Resend 발송 완료: ${to}`);
    return;
  }

  // ── Nodemailer (SMTP / Ethereal) ────────────────────────────────────────
  if (!transporter) {
    console.error('❌ 이메일 트랜스포터가 초기화되지 않았습니다.');
    return;
  }

  const info = await transporter.sendMail({
    from: `"ChannelAI 리포트" <${mode === 'ethereal' ? 'report@channelai.com' : process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  if (mode === 'ethereal') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('');
    console.log('  ┌──────────────────────────────────────────────────┐');
    console.log(`  │ 📧 To: ${to}`);
    console.log(`  │ 📋 Subject: ${subject.substring(0, 40)}...`);
    console.log(`  │ 🔗 미리보기: ${previewUrl}`);
    console.log('  └──────────────────────────────────────────────────┘');
    console.log('');
  }
};
