const puppeteer = require('puppeteer');

(async () => {
  console.log('launching puppeteer...');
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent('<h1>Test</h1>', { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf();
    console.log('PDF generated, size:', pdfBuffer.length);
    await browser.close();
  } catch (error) {
    console.error('ERROR:', error);
  }
})();
