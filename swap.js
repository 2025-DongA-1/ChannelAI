const fs = require('fs');
const filePath = 'd:/최성훈/프로잭트/실전/ChannelAI/ChannelAI/frontend/src/pages/MonthlyReportPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const str2 = '          {/* ===== 탭 2: 채널별 분석 ===== */}';
const str3 = '          {/* ===== 탭 3: 추이 분석 ===== */}';
const capStr = '          {/* [2026-03-12 16:02] 수정 이유: 인사이트 페이지 양식에 맞춘 캠페인 성과 탭 구현';

const pStart = content.indexOf(str2);
const tStart = content.indexOf(str3);
const cStart = content.indexOf(capStr);

if (pStart > -1 && tStart > -1 && cStart > -1) {
  const pBlock = content.substring(pStart, tStart);
  const tBlock = content.substring(tStart, cStart);
  fs.writeFileSync(filePath, content.substring(0, pStart) + tBlock + pBlock + content.substring(cStart), 'utf8');
  console.log('SWAPPED!');
} else {
  console.log('NOT FOUND');
}
