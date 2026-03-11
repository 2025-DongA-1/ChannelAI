import { sendDailyReports } from './src/services/reportService';

sendDailyReports()
  .then(() => {
    console.log('Daily reports test finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error testing daily reports:', err);
    process.exit(1);
  });
