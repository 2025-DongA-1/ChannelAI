import dotenv from 'dotenv';
import path from 'path';
import { verifyEmailConnection, sendEmail } from './src/services/emailService';

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const TARGET_EMAIL = process.argv[2] || 'test@example.com';

async function testEmail() {
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log(' 📧 이메일 발송 기능 점검');
  console.log('══════════════════════════════════════════════');
  console.log(`  EMAIL_FROM : ${process.env.EMAIL_FROM}`);
  console.log(`  수신 대상  : ${TARGET_EMAIL}`);
  console.log('══════════════════════════════════════════════');
  console.log('');

  try {
    const ok = await verifyEmailConnection();
    if (!ok) {
      console.error('❌ 이메일 서비스 초기화 실패. 종료합니다.');
      process.exit(1);
    }

    console.log('');
    console.log('📨 테스트 메일 발송 중...');
    await sendEmail(
      TARGET_EMAIL,
      '[ChannelAI] 이메일 발송 점검 테스트',
      `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f8f9fa;border-radius:12px;">
          <h2 style="color:#4f46e5;">✅ ChannelAI 이메일 발송 점검</h2>
          <p>안녕하세요!</p>
          <p>이 메일은 <strong>channelai.kro.kr</strong> 도메인에서 정상적으로 발송된 테스트 이메일입니다.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="color:#64748b;font-size:14px;">발신: report@channelai.kro.kr<br/>발송 시각: ${new Date().toLocaleString('ko-KR')}</p>
        </div>
      `
    );

    console.log(`✅ 테스트 메일 발송 완료 → ${TARGET_EMAIL}`);
    console.log('');
  } catch (err) {
    console.error('❌ 발송 실패:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testEmail();
