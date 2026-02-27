import axios from 'axios';
import * as cheerio from 'cheerio';

export interface KarrotCrawlResult {
  campaignName: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  [key: string]: any;
}

/**
 * 당근마켓 광고 결과 페이지를 크롤링하는 서비스
 * @param adUrl 광고 성과 페이지 URL
 * @param sessionCookie 사용자의 daangn.sid 쿠키
 * @returns 광고 성과 데이터 (캠페인명, 노출수, 클릭수, 비용, 전환 등)
 */
export async function crawlKarrotAdResult(adUrl: string, sessionCookie: string): Promise<KarrotCrawlResult> {
  try {
    const response = await axios.get(adUrl, {
      headers: {
        'Cookie': `daangn.sid=${sessionCookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    const $ = cheerio.load(response.data);
    // TODO: 실제 광고 성과 데이터 셀렉터에 맞게 파싱
    const campaignName = $('h1').first().text().trim();
    const impressions = parseInt($('[data-testid="impressions"]').text().replace(/[^\d]/g, ''));
    const clicks = parseInt($('[data-testid="clicks"]').text().replace(/[^\d]/g, ''));
    const cost = parseInt($('[data-testid="cost"]').text().replace(/[^\d]/g, ''));
    const conversions = parseInt($('[data-testid="conversions"]').text().replace(/[^\d]/g, ''));
    return { campaignName, impressions, clicks, cost, conversions };
  } catch (error: any) {
    throw new Error('크롤링 실패: ' + (error.response?.status || error.message));
  }
}
