import fs from 'fs';
import path from 'path';

// 로그 디렉토리 경로 설정
// 실서버 기준 경로: /opt/marketing-platform/backend/logs/
const logDir = path.join(__dirname, '../../logs');

// 서버 시작 시 로그 폴더가 없으면 자동으로 생성
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * 한국 표준시(KST, UTC+9) 기준 타임스탬프 문자열 반환
 * 예: "2026-03-04 13:45:53 KST"
 * 로그 파일에 UTC(Z) 대신 한국 시간이 찍히도록 변경
 */
const getKSTTimestamp = (): string => {
  const now = new Date();
  // UTC 시간에 9시간(밀리초 단위) 더하기
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);
  // ISO 형식에서 'Z'(UTC 표시)를 제거하고 ' KST' 붙이기
  return kstDate.toISOString().replace('T', ' ').replace('Z', '') + ' KST';
};

/**
 * 인증(로그인) 관련 로그를 auth.log 파일에 기록
 * @param message - 로그 메시지 (예: "Login Successful")
 * @param success - 성공 여부 (true: SUCCESS, false: FAILURE)
 * @param data    - 추가 데이터 (이메일, 유저ID, 에러 등)
 */
export const logAuth = (message: string, success: boolean, data?: any) => {
  const timestamp = getKSTTimestamp(); // ← UTC 대신 한국 시간 사용
  const status = success ? 'SUCCESS' : 'FAILURE';
  const dataString = data ? `| DATA: ${JSON.stringify(data)}` : '';
  const logMessage = `[${timestamp}] [AUTH] [${status}] ${message} ${dataString}\n`;
  
  // 파일에 비동기 방식으로 추가 저장 (서버 성능에 영향 없음)
  fs.appendFile(path.join(logDir, 'auth.log'), logMessage, (err) => {
    if (err) console.error('Auth log write error:', err);
  });
};

/**
 * 광고 API 연동(메타/구글/네이버 광고) 관련 로그를 integration.log 파일에 기록
 * @param message - 로그 메시지 (예: "OAuth Connection Successful")
 * @param success - 성공 여부 (true: SUCCESS, false: FAILURE)
 * @param data    - 추가 데이터 (플랫폼, 유저ID, 에러 등)
 */
export const logIntegration = (message: string, success: boolean, data?: any) => {
  const timestamp = getKSTTimestamp(); // ← UTC 대신 한국 시간 사용
  const status = success ? 'SUCCESS' : 'FAILURE';
  const dataString = data ? `| DATA: ${JSON.stringify(data)}` : '';
  const logMessage = `[${timestamp}] [INTEGRATION] [${status}] ${message} ${dataString}\n`;
  
  // 파일에 비동기 방식으로 추가 저장 (서버 성능에 영향 없음)
  fs.appendFile(path.join(logDir, 'integration.log'), logMessage, (err) => {
    if (err) console.error('Integration log write error:', err);
  });
};
