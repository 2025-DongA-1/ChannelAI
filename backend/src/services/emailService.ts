/**
 * emailService.ts
 * Nodemailer 설정 및 이메일 전송 공통 함수
 */
import nodemailer from 'nodemailer';

// Gmail SMTP 트랜스포터 (환경변수에서 인증 정보 읽음)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // TLS 사용 (587 포트)
  auth: {
    user: process.env.SMTP_USER,  // Gmail 주소
    pass: process.env.SMTP_PASS,  // Gmail 앱 비밀번호
  },
});

/** 이메일 전송 공통 함수 */
export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  await transporter.sendMail({
    from: `"ChannelAI 리포트" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

/** 트랜스포터 연결 확인 (서버 시작 시 호출) */
export const verifyEmailConnection = async (): Promise<boolean> => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  이메일 설정 없음 (SMTP_USER, SMTP_PASS) - 리포트 이메일 비활성화');
    return false;
  }
  try {
    await transporter.verify();
    console.log('✅ 이메일 서버 연결 성공');
    return true;
  } catch (err) {
    console.error('❌ 이메일 서버 연결 실패:', err);
    return false;
  }
};
