import fs from 'fs';
import { generatePdfFromPage } from './src/controllers/reportController';

async function run() {
  const req = {
    query: { month: '2026-02', type: 'insights' },
    user: { id: 1 }
  };
  const res = {
    setHeader: (a: string, b: string) => console.log('Header:', a, b),
    send: (buf: Buffer) => {
      console.log('Success! Buffer size:', buf.length);
      fs.writeFileSync('test-result.pdf', buf);
    },
    status: (code: number) => {
      console.log('Error status:', code);
      return { json: (data: any) => console.log('Error body:', data) };
    }
  };

  try {
    await generatePdfFromPage(req as any, res as any);
  } catch (err) {
    console.error('Test script caught error:', err);
  }
}
run();
