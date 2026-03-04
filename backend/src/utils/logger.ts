import fs from 'fs';
import path from 'path';

// 로그 디렉토리 경로 설정
const logDir = path.join(__dirname, '../../logs');

// 디렉토리가 없으면 자동 생성
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const logAuth = (message: string, success: boolean, data?: any) => {
  const timestamp = new Date().toISOString();
  const status = success ? 'SUCCESS' : 'FAILURE';
  const dataString = data ? `| DATA: ${JSON.stringify(data)}` : '';
  const logMessage = `[${timestamp}] [AUTH] [${status}] ${message} ${dataString}\n`;
  
  fs.appendFile(path.join(logDir, 'auth.log'), logMessage, (err) => {
    if (err) console.error('Auth log write error:', err);
  });
};

export const logIntegration = (message: string, success: boolean, data?: any) => {
  const timestamp = new Date().toISOString();
  const status = success ? 'SUCCESS' : 'FAILURE';
  const dataString = data ? `| DATA: ${JSON.stringify(data)}` : '';
  const logMessage = `[${timestamp}] [INTEGRATION] [${status}] ${message} ${dataString}\n`;
  
  fs.appendFile(path.join(logDir, 'integration.log'), logMessage, (err) => {
    if (err) console.error('Integration log write error:', err);
  });
};
