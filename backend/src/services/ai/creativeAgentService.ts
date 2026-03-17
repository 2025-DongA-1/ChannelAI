import { AIAnalysisService } from './aiAnalysisService';
import pool from '../../config/database';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse') as any;

const aiService = new AIAnalysisService();

// ──────────────────────────────────────────────
// 파일에서 텍스트 추출 유틸리티
// ──────────────────────────────────────────────

/** PDF 파일에서 텍스트 추출 (최대 3000자) - pdf-parse v2 API */
async function extractTextFromPDF(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text.slice(0, 3000);
}

/** 텍스트 파일 읽기 (최대 3000자) */
function extractTextFromFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8').slice(0, 3000);
}

/** 이미지를 base64로 인코딩 (최대 2MB 제한) */
function encodeImageToBase64(filePath: string): { base64: string; mimeType: string } | null {
  const stats = fs.statSync(filePath);
  if (stats.size > 2 * 1024 * 1024) return null; // 2MB 초과 시 null
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const mimeType = mimeMap[ext] || 'image/jpeg';
  const base64 = fs.readFileSync(filePath).toString('base64');
  return { base64, mimeType };
}

// ──────────────────────────────────────────────
// 사용자의 고성과 캠페인 데이터 조회 (RAG 컨텍스트)
// ──────────────────────────────────────────────

/** 선택된 특정 캠페인의 상세 성과 컨텍스트 조회 */
async function getSpecificCampaignContext(campaignId: number, userId: number): Promise<string> {
  try {
    // 캠페인 기본 정보 + 누적 성과
    const result = await pool.query(
      `SELECT c.campaign_name, c.platform, c.status,
              SUM(cm.impressions) as impressions,
              SUM(cm.clicks) as clicks,
              SUM(cm.conversions) as conversions,
              SUM(cm.cost) as cost,
              SUM(cm.revenue) as revenue,
              CASE WHEN SUM(cm.cost) > 0 THEN SUM(cm.revenue)/SUM(cm.cost) ELSE 0 END as roas,
              CASE WHEN SUM(cm.impressions) > 0 THEN SUM(cm.clicks)/SUM(cm.impressions)*100 ELSE 0 END as ctr
       FROM campaigns c
       LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
       JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
       WHERE c.id = ? AND ma.user_id = ?
       GROUP BY c.id`,
      [campaignId, userId]
    );

    const rows = result.rows;

    if (!rows || rows.length === 0) return '(선택된 캠페인 정보 없음)';

    const r = rows[0];
    const roas = Number(r.roas).toFixed(2);
    const ctr = Number(r.ctr).toFixed(2);
    const cost = Number(r.cost).toLocaleString();
    
    return `
[현재 분석 대상 기존 캠페인]
- 캠페인명: ${r.campaign_name}
- 플랫폼: ${r.platform}
- 상태: ${r.status}
- 총 비용: ${cost}원
- 성과 지표: ROAS ${roas} (목표 대비 분석 필요), CTR ${ctr}%
- 요청 사항: 위 캠페인의 성과를 분석하여, 더 나은 효율을 낼 수 있는 개선된 소재와 전략을 제안할 것.
`;
  } catch (e) {
    console.error('캠페인 컨텍스트 조회 실패:', e);
    return '';
  }
}

async function getUserTopCampaignContext(userId: number): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT c.campaign_name, c.platform, 
              SUM(cm.impressions) as impressions,
              SUM(cm.clicks) as clicks,
              SUM(cm.conversions) as conversions,
              SUM(cm.cost) as cost,
              SUM(cm.revenue) as revenue,
              CASE WHEN SUM(cm.cost) > 0 THEN SUM(cm.revenue)/SUM(cm.cost) ELSE 0 END as roas,
              CASE WHEN SUM(cm.impressions) > 0 THEN SUM(cm.clicks)/SUM(cm.impressions)*100 ELSE 0 END as ctr
       FROM campaigns c
       JOIN campaign_metrics cm ON c.id = cm.campaign_id
       JOIN marketing_accounts ma ON c.marketing_account_id = ma.id
       WHERE ma.user_id = ?
       GROUP BY c.id
       ORDER BY roas DESC
       LIMIT 5`,
      [userId]
    );
    
    const rows = result.rows;
    if (!rows || rows.length === 0) return '(기존 캠페인 데이터 없음)';
    return rows.map((r: any) =>
      `- ${r.campaign_name} (${r.platform}): ROAS ${Number(r.roas).toFixed(2)}, CTR ${Number(r.ctr).toFixed(2)}%`
    ).join('\n');
  } catch {
    return '(기존 캠페인 데이터 조회 실패)';
  }
}

// ──────────────────────────────────────────────
// 실시간 트렌드 검색 (네이버 뉴스 API → DuckDuckGo 폴백)
// ──────────────────────────────────────────────

/** 네이버 검색 API로 최신 뉴스/블로그 트렌드 수집 */
async function fetchNaverTrend(keyword: string): Promise<string> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return '';

  try {
    const res = await axios.get('https://openapi.naver.com/v1/search/news.json', {
      params: { query: keyword, display: 7, sort: 'date' },
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      timeout: 5000,
    });
    const items = res.data?.items || [];
    if (items.length === 0) return '';
    return items
      .map((item: any) => {
        const title = item.title.replace(/<[^>]+>/g, '');
        const desc = item.description.replace(/<[^>]+>/g, '').slice(0, 120);
        return `- ${title}: ${desc}`;
      })
      .join('\n');
  } catch (e) {
    console.error('[Trend] 네이버 검색 실패:', e);
    return '';
  }
}

/** DuckDuckGo HTML 스크래핑 폴백 (API 키 불필요) */
async function fetchDuckDuckGoTrend(keyword: string): Promise<string> {
  try {
    const res = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q: `${keyword} 트렌드 2026`, kl: 'kr-kr' },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PlanBe/1.0)' },
      timeout: 5000,
    });
    const $ = cheerio.load(res.data);
    const results: string[] = [];
    $('.result__body').each((i, el) => {
      if (i >= 5) return false;
      const title = $(el).find('.result__a').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim().slice(0, 120);
      if (title) results.push(`- ${title}: ${snippet}`);
    });
    return results.join('\n');
  } catch (e) {
    console.error('[Trend] DuckDuckGo 스크래핑 실패:', e);
    return '';
  }
}

/** 트렌드 컨텍스트 통합 함수 */
async function fetchTrendContext(businessType: string, productName: string): Promise<string> {
  const keyword = `${businessType} ${productName} 광고 트렌드`;
  // 1차: 네이버 뉴스
  let trend = await fetchNaverTrend(keyword);
  // 2차: DuckDuckGo 폴백
  if (!trend) {
    trend = await fetchDuckDuckGoTrend(keyword);
  }
  if (!trend) return '';
  return `\n[최신 온라인 트렌드 검색 결과 (${new Date().toISOString().split('T')[0]})]\n${trend}\n→ 위 트렌드 키워드와 소비자 관심사를 카피라이팅에 자연스럽게 반영하세요.\n`;
}

// ──────────────────────────────────────────────
// 핵심: 광고 소재 생성 메인 함수
// ──────────────────────────────────────────────

export interface CreativeInput {
  businessType: string;      // 업종
  productName: string;       // 상품명
  targetAudience: string;    // 타겟 고객
  tone: string;              // 톤앤매너
  objective: string;         // 광고 목적 (인지도/트래픽/전환)
  additionalInfo?: string;   // 추가 정보 (자유 입력)
  userId: number;
  campaignId?: number;       // [추가] 선택된 기존 캠페인 ID
}

export interface CreativeResult {
  uspAnalysis: string;
  copies: {
    meta: { headlines: string[]; bodies: string[]; cta: string };
    google: { headlines: string[]; descriptions: string[]; cta: string };
    naver: { titles: string[]; descriptions: string[]; cta: string };
    karrot: { titles: string[]; bodies: string[]; cta: string };
  };
  visualGuide: {
    imageComposition: string;
    colorPalette: string;
    textOverlay: string;
    specs: Record<string, string>;
    abTestSuggestion: string;
    aiImagePrompts: {
      main: string;
      variation: string;
      story: string;
    };
  };
  strategy: string;
  complianceNotes: string;
  trendKeywords?: string;
}

export async function generateCreativePackage(
  input: CreativeInput,
  documentPath?: string,   // 업로드된 상품 문서 경로
  imagePath?: string,      // 업로드된 기존 광고 이미지 경로
): Promise<CreativeResult> {

  // 1) 문서 텍스트 추출
  let documentContext = '';
  if (documentPath && fs.existsSync(documentPath)) {
    try {
      const ext = path.extname(documentPath).toLowerCase();
      if (ext === '.pdf') {
        documentContext = await extractTextFromPDF(documentPath);
      } else if (['.txt', '.md', '.csv'].includes(ext)) {
        documentContext = extractTextFromFile(documentPath);
      }
    } catch (e) {
      console.error('[Creative Agent] 문서 추출 실패:', e);
    }
  }

  // 2) 이미지 분석 (Gemini Vision 활용)
  let imageAnalysis = '';
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      imageAnalysis = await analyzeAdImage(imagePath);
    } catch (e) {
      console.error('[Creative Agent] 이미지 분석 실패:', e);
    }
  }

  // 3) 사용자 기존 고성과 캠페인 컨텍스트 (RAG)
  // [수정] 사용자가 특정 캠페인을 지정했다면 그것을 최우선으로 분석
  let campaignContext = '';
  if (input.campaignId) {
    campaignContext = await getSpecificCampaignContext(input.campaignId, input.userId);
  } else {
    // 없으면 상위 5개 캠페인 요약
    campaignContext = await getUserTopCampaignContext(input.userId);
  }

  // 4) 실시간 트렌드 검색
  let trendContext = '';
  try {
    trendContext = await fetchTrendContext(input.businessType, input.productName);
  } catch (e) {
    console.error('[Creative Agent] 트렌드 검색 실패:', e);
  }

  // 5) 통합 프롬프트 구성 & LLM 호출
  const result = await callCreativeLLM(input, documentContext, imageAnalysis, campaignContext, trendContext);

  // 6) 파일 정리 (업로드 임시파일 삭제)
  if (documentPath && fs.existsSync(documentPath)) {
    fs.unlinkSync(documentPath);
  }
  if (imagePath && fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }

  return result;
}

// ──────────────────────────────────────────────
// OpenAI Vision으로 광고 이미지 분석 (GPT-4o-mini 지원)
// ──────────────────────────────────────────────

async function analyzeAdImage(imagePath: string): Promise<string> {
  const imageData = encodeImageToBase64(imagePath);
  if (!imageData) return '(이미지가 2MB를 초과하여 분석할 수 없습니다)';

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return '(OpenAI API 키가 없어 이미지를 분석할 수 없습니다. 텍스트 기반으로만 생성합니다.)';
  }

  try {
    const axios = require('axios');
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `이 광고 이미지를 마케팅 전문가 관점에서 분석해주세요. 300자 이내로 다음을 포함하세요:
1. 이미지의 주요 구성요소 (인물, 제품, 배경, 텍스트 등)
2. 색상 톤과 분위기
3. 광고적 강점과 개선 가능한 부분
4. 어떤 타겟/플랫폼에 적합해 보이는지`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageData.mimeType};base64,${imageData.base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        }
      }
    );
    
    return response.data.choices[0].message.content.slice(0, 500);
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error('[Creative Agent] OpenAI Vision 에러:', errorMsg);
    return '(이미지 분석 중 오류가 발생했습니다)';
  }
}

// ──────────────────────────────────────────────
// 통합 LLM 호출 (카피 + 비주얼 가이드 + 전략)
// ──────────────────────────────────────────────

async function callCreativeLLM(
  input: CreativeInput,
  documentContext: string,
  imageAnalysis: string,
  campaignContext: string,
  trendContext: string = '',
): Promise<CreativeResult> {

  const docSection = documentContext
    ? `\n[업로드된 상품/서비스 문서 내용]\n${documentContext}\n`
    : '';

  const imageSection = imageAnalysis
    ? `\n[업로드된 기존 광고 이미지 AI 분석 결과]\n${imageAnalysis}\n→ 이 이미지의 강점은 살리고 약점은 보완하는 방향으로 새 소재를 제안하세요.\n`
    : '';

  const campaignSection = campaignContext
    ? `\n[이 사용자의 고성과 캠페인 데이터 (RAG)]\n${campaignContext}\n→ 이 사용자에게 효과적이었던 플랫폼/전략 패턴을 참고하세요.\n`
    : '';

  const trendSection = trendContext || '';

  const prompt = `당신은 한국 소상공인을 돕는 디지털 마케팅 크리에이티브 전문가입니다.
아래 정보를 바탕으로 4개 광고 플랫폼(Meta, Google, Naver, 당근마켓)용 광고 소재 패키지를 생성하세요.

[사용자 입력 정보]
- 업종: ${input.businessType}
- 상품명: ${input.productName}
- 타겟 고객: ${input.targetAudience}
- 톤앤매너: ${input.tone}
- 광고 목적: ${input.objective}
${input.additionalInfo ? `- 추가 정보: ${input.additionalInfo}` : ''}
${docSection}${imageSection}${campaignSection}${trendSection}

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON만):
{
  "uspAnalysis": "이 상품의 핵심 소구점(USP) 3가지를 한 문단으로 분석",
  "copies": {
    "meta": {
      "headlines": ["감성적 헤드라인 15~30자 3개"],
      "bodies": ["인스타/페이스북용 본문 50~80자 3개"],
      "cta": "CTA 버튼 텍스트"
    },
    "google": {
      "headlines": ["반각 30자 이내 제목 3개"],
      "descriptions": ["반각 90자 이내 설명문 2개"],
      "cta": "CTA 텍스트"
    },
    "naver": {
      "titles": ["네이버 검색광고 25자 이내 제목 3개"],
      "descriptions": ["45자 이내 설명문 2개"],
      "cta": "CTA 텍스트"
    },
    "karrot": {
      "titles": ["동네 친근감 있는 15~25자 제목 3개"],
      "bodies": ["당근마켓 스타일 생활밀착 본문 50~80자 2개"],
      "cta": "CTA 텍스트"
    }
  },
  "visualGuide": {
    "imageComposition": "추천 이미지 구성 (인물/제품/배경 비율 등)",
    "colorPalette": "업종에 맞는 추천 색상 2~3개 (HEX 코드 포함)",
    "textOverlay": "이미지 위 텍스트 배치 가이드",
    "specs": {
      "meta_feed": "1080×1080px",
      "meta_story": "1080×1920px",
      "google_display": "300×250px, 728×90px",
      "naver_banner": "1200×628px",
      "karrot": "720×720px"
    },
    "abTestSuggestion": "A/B 테스트 제안 (소재A vs 소재B 차이점)",
    "aiImagePrompts": {
      "main": "이 상품의 메인 광고 이미지를 생성하기 위한 영문 프롬프트. Midjourney/DALL-E/Gemini 등 이미지 생성 AI에 바로 붙여넣기 가능한 상세한 영문 묘사 (구도, 조명, 색감, 스타일, 분위기 등 포함). 200자 내외.",
      "variation": "메인 이미지의 변형 버전용 영문 프롬프트 (다른 각도, 색상, 또는 계절감 반영). 200자 내외.",
      "story": "Instagram 스토리/릴스용 세로형 이미지 생성 영문 프롬프트 (9:16 비율, 모바일 최적화 구도). 200자 내외."
    }
  },
  "strategy": "총 200자 이내의 통합 광고 전략 요약 (예산 배분 방향, 타이밍, 주의점 포함)",
  "complianceNotes": "매체별 광고 심사 통과를 위한 주의사항 (금지 표현, 글자수 규정 등)",
  "trendKeywords": "카피라이팅에 반영한 최신 트렌드 키워드 3~5개를 쉼표로 나열 (트렌드 데이터가 없으면 빈 문자열)"
}`;

  try {
    const raw = await (aiService as any).call(prompt);
    // JSON 파싱 시도 (LLM이 마크다운 코드블록으로 감쌀 수 있으므로 정리)
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed as CreativeResult;
  } catch (err: any) {
    console.error('[Creative Agent] LLM 응답 파싱 실패:', err.message);
    // 파싱 실패 시 기본 구조 반환
    return {
      uspAnalysis: 'AI 응답을 파싱하는 중 오류가 발생했습니다. 다시 시도해주세요.',
      copies: {
        meta: { headlines: [], bodies: [], cta: '' },
        google: { headlines: [], descriptions: [], cta: '' },
        naver: { titles: [], descriptions: [], cta: '' },
        karrot: { titles: [], bodies: [], cta: '' },
      },
      visualGuide: {
        imageComposition: '',
        colorPalette: '',
        textOverlay: '',
        specs: {},
        abTestSuggestion: '',
        aiImagePrompts: { main: '', variation: '', story: '' },
      },
      strategy: '',
      complianceNotes: '',
    };
  }
}

// ──────────────────────────────────────────────
// DB 저장: 생성 이력
// ──────────────────────────────────────────────

export async function saveCreativeGeneration(
  userId: number,
  input: CreativeInput,
  result: CreativeResult,
  hadDocument: boolean,
  hadImage: boolean,
): Promise<number> {
  const res = await pool.query(
    `INSERT INTO creative_generations 
     (user_id, business_type, product_name, target_audience, tone, objective, 
      additional_info, had_document, had_image, generated_copies, visual_guide, 
      strategy_summary, compliance_notes, usp_analysis)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.businessType,
      input.productName,
      input.targetAudience,
      input.tone,
      input.objective,
      input.additionalInfo || null,
      hadDocument ? 1 : 0,
      hadImage ? 1 : 0,
      JSON.stringify(result.copies),
      JSON.stringify(result.visualGuide),
      result.strategy,
      result.complianceNotes,
      result.uspAnalysis,
    ]
  );
  return res.insertId!;
}

/** 사용자의 생성 이력 조회 */
export async function getCreativeHistory(userId: number) {
  const result = await pool.query(
    `SELECT id, business_type, product_name, objective, created_at 
     FROM creative_generations 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT 20`,
    [userId]
  );
  return result.rows;
}

/** 특정 생성 이력 상세 조회 */
export async function getCreativeDetail(userId: number, id: number) {
  const result = await pool.query(
    `SELECT * FROM creative_generations WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.rows?.[0] || null;
}

/** 특정 생성 이력 삭제 */
export async function deleteCreativeHistory(userId: number, id: number) {
  await pool.query(
    `DELETE FROM creative_generations WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
}
