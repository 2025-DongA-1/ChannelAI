import dotenv from 'dotenv';
import path from 'path';
import { verifyEmailConnection, sendEmail } from './src/services/emailService';

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkEmail() {
  console.log('--- 이메일 연동 테스트 시작 ---');
  try {
    const isConnected = await verifyEmailConnection();
    if (isConnected) {
      console.log('✅ 이메일 서비스 초기화 성공 (Resend 또는 SMTP 연결됨)');
      console.log('테스트 메일을 발송하려면 아래 코드를 주석 해제하고 실행하세요:');
      console.log(`// await sendEmail('YOUR_EMAIL@gmail.com', '[테스트] 연결 확인', '<p>이메일 발송이 정상적으로 작동합니다.</p>');`);
    } else {
      console.log('❌ 이메일 서비스 초기화 실패');
    }
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

checkEmail();
