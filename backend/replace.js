const fs = require('fs');

const path = 'src/controllers/reportController.ts';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '/** 입력한 이메일로 월별 보고서 + PDF 첨부 발송 (POST /api/v1/report/send-to) */';
let endMarkerSearch = 'export const getMonthlyReportData = async (req: AuthRequest, res: Response) => {';

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarkerSearch);

if (startIndex === -1 || endIndex === -1) {
  console.log('Markers not found');
  process.exit(1);
}

// Find previous line index of endMarkerSearch to include the blank line before it
endIndex = content.lastIndexOf('\n', endIndex - 2) + 1;

const newFunc = `/** 입력한 이메일로 메일 내용 최소화 + 프론트엔드 PDF 첨부 발송 (POST /api/v1/report/send-to) */
export const triggerSendToEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: '이메일 주소를 입력하세요.' });
    }
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: '올바른 이메일 형식이 아닙니다.' });
    }
    const userId = req.user?.id || 1;

    res.json({ success: true, message: \`\${email} 로 월별 성과 보고서를 전송합니다. 10초 가량 소요될 수 있습니다.\` });

    (async () => {
      let browser;
      try {
        const userResult = await pool.query(
          'SELECT up.name FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ?',
          [userId]
        );
        const userName = userResult.rows[0]?.name || '사용자';
        const targetMonth = new Date().toISOString().slice(0, 7);
        const frontendUrl = \`http://localhost:5173/report/monthly?month=\${targetMonth}&export=false\`;

        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 1080 });
        
        await page.evaluateOnNewDocument(() => {
          localStorage.setItem('auth-storage', JSON.stringify({
            state: { token: 'dummy_token', isAuthenticated: true, user: { id: 1, email: 'admin@channel.ai' } },
            version: 0
          }));
        });

        await page.goto(frontendUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10px', bottom: '10px' }
        });

        const subject = \`📊 [ChannelAI] \${userName}님의 \${targetMonth}월 통합 보고서\`;
        const emailHtml = \`<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Apple SD Gothic Neo',Malgun Gothic,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#7c3aed);padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:800;">📊 \${targetMonth}월 ChannelAI 시스템 보고서</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 16px;">안녕하세요, <strong>\${userName}</strong>님 👋</p>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;">요청하신 광고 성과 리포트가 완성되었습니다.<br>상세한 차트와 웹 뷰 수준의 깔끔한 분석 내용은 첨부된 PDF 파일을 확인해 주시기 바랍니다.</p>
    </div>
  </div>
</body>
</html>\`;

        await sendEmail(email, subject, emailHtml, [
          {
            filename: \`ChannelAI_Report_\${targetMonth}.pdf\`,
            content: Buffer.from(pdfBuffer),
          }
        ]);
        console.log(\`[EmailReport] 발송 완료: \${email}\`);

      } catch (err) {
        console.error('[EmailReport] 비동기 오류:', err);
      } finally {
        if (browser) await browser.close();
      }
    })();

  } catch (error) {
    res.status(500).json({ success: false, message: '발송 실패' });
  }
};

/** 월별 리포트 데이터 전체 조회 (GET /api/v1/report/monthly) */
`;

const newContent = content.substring(0, startIndex) + newFunc + content.substring(endIndex + 64);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Successfully updated the file.');
