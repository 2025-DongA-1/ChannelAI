import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export class AIAnalysisService {
  private provider: string;
  private groq: Groq | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private openaiKey: string | undefined;

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'groq';

    if (this.provider === 'groq') {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      console.log('[AI Service] Provider: Groq (llama-3.3-70b) - 무료');
    } else if (this.provider === 'gemini') {
      const key = process.env.GEMINI_API_KEY;
      if (key) {
        this.gemini = new GoogleGenerativeAI(key);
        console.log('[AI Service] Provider: Google Gemini 2.0 Flash');
      }
    } else if (this.provider === 'openai') {
      this.openaiKey = process.env.OPENAI_API_KEY;
      console.log('[AI Service] Provider: OpenAI GPT-4o-mini (유료)');
    }
  }

  private async call(prompt: string): Promise<string> {
    // --- Groq ---
    if (this.provider === 'groq' && this.groq) {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 400,
      });
      return completion.choices[0]?.message?.content ?? '';
    }

    // --- Gemini ---
    if (this.provider === 'gemini' && this.gemini) {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }

    // --- OpenAI ---
    if (this.provider === 'openai' && this.openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 400,
        }),
      });
      const data = await response.json() as any;
      return data.choices[0].message.content;
    }

    throw new Error('AI 프로바이더가 올바르게 설정되지 않았습니다.');
  }

  // ──────────────────────────────────────────────
  // XGBoost 예측 결과 분석 (300자 내외)
  // ──────────────────────────────────────────────
  async analyzeXGBoost(mae: number, platformMae: any[], sample: any): Promise<string> {
    try {
      const prompt = `당신은 데이터 사이언스 기반 마케팅 컨설턴트입니다.
XGBoost 모델의 앱 설치 수 예측 결과를 보고 마케터에게 300자 이내의 한글 분석을 제공해 주세요.

[데이터]
- 전체 오차(MAE): ${mae}건 (적을수록 정확함)
- 매체별 오차 상황: ${JSON.stringify(platformMae)}
- 테스트 샘플 결과: ${JSON.stringify(sample)}

[분석 요청]
1. 현재 예측의 신뢰도를 평가하십시오.
2. 오차가 두드러지는 매체가 있다면 주의사항을 언급하십시오.
3. 마케터를 위한 짧은 제언(인사이트)으로 마무리하십시오.
* 반드시 300자 이내로 작성하십시오.`;

      return await this.call(prompt);
    } catch (error) {
      console.error('AI Analysis (XGBoost) failed:', error);
      return '분석 데이터를 불러오는 중 오류가 발생했습니다.';
    }
  }

  // ──────────────────────────────────────────────
  // 캠페인 랭킹 분석 (300자 내외)
  // ──────────────────────────────────────────────
  async analyzeCampaignRanks(ranks: any[]): Promise<string> {
    try {
      const prompt = `당신은 가게 매출을 같이 고민하는 '마케팅 비서'입니다.
광고 성적표를 보고 사장님께 힘이 되는 전략 보고를 300자 이내로 작성해 주세요.

[데이터]
${JSON.stringify(ranks)}

[분석 요청]
[작성 가이드]
1. "사장님, 지금 OO매체 광고가 효자 노릇을 톡톡히 하고 있어요!"라고 칭찬으로 시작하세요.
2. 성적이 아쉬운 광고는 "이 광고들은 내용을 조금만 바꾸면 다시 살아날 수 있어요"라고 부드럽게 제안하세요.
3. "다음번에는 잘나오는 곳에 예산을 조금 더 집중해 볼까요?"라고 명확하게 방향을 짚어주세요.
* 전문 용어 없이, 300자 이내의 친절한 반존대나 격식체로 작성하십시오.`;

      return await this.call(prompt);
    } catch (error) {
      console.error('AI Analysis (Ranks) failed:', error);
      return '캠페인 랭킹 분석 중 오류가 발생했습니다.';
    }
  }

  // ──────────────────────────────────────────────
  // Random Forest 매체 추천 분석 (300자 내외)
  // ──────────────────────────────────────────────
  async analyzeRandomForest(accuracy: number, metrics: any[], sample: any): Promise<string> {
    try {
      const prompt = `당신은 소상공인 사장님의 광고를 돕는 친절한 'AI 파트너'입니다.
어려운 기술 용어(XGBoost, MAE 등)는 최대한 쓰지 말고, 옆에서 말해주듯 300자 이내로 분석해 주세요.

[데이터]
- 모델 정확도: ${accuracy}
- 매체별 성능 지표: ${JSON.stringify(metrics)}
- 추천 시뮬레이션: ${JSON.stringify(sample)}

[분석 요청]
1. "이번 예측 결과는 ~정도 믿으셔도 됩니다"라고 확신을 주세요.
2. 예측이 잘 안 맞는 매체가 있다면 "OO광고는 유독 변동이 심하니 조금 더 지켜봐야 해요"라고 알려주세요.
3. "이 데이터를 믿고 광고비를 조절해 보세요" 같은 실질적인 응원으로 마무리하세요.
* 반드시 300자 이내의 따뜻한 한글로 작성하십시오.`;

      return await this.call(prompt);
    } catch (error) {
      console.error('AI Analysis (RF) failed:', error);
      return '매체 추천 모델 분석 중 오류가 발생했습니다.';
    }
  }

  // ──────────────────────────────────────────────
  // AI 최적화 추천 항목별 이유 (70자 이내)
  // ──────────────────────────────────────────────
  async analyzeRecommendation(rec: {
    type: string;
    campaignName?: string;
    platform?: string;
    reason: string;
  }): Promise<string> {
    try {
      const typeLabel =
        rec.type === 'budget_increase'          ? '예산 증액 추천' :
        rec.type === 'budget_decrease'          ? '예산 감액 추천' :
        rec.type === 'creative_optimization'    ? '소재 개선 추천' :
        rec.type === 'platform_diversification' ? '플랫폼 다각화' : '최적화 추천';

      const prompt = `당신은 마케팅 비서입니다.
아래 추천 항목에 대해 사장님이 바로 이해할 수 있는 추천 이유를 70자 이내의 한 줄 한국어로 작성해 주세요.
전문 용어(ROAS, CTR 등)가 있다면 쉬운 말로 풀어 쓰세요.

추천 종류: ${typeLabel}
캠페인: ${rec.campaignName || '전체'}
매체: ${rec.platform || '전체'}
기존 이유: ${rec.reason}

* 딱 한 문장, 70자 이내로만 작성하세요. 다른 말은 하지 마세요.`;

      const result = await this.call(prompt);
      // 70자 초과 시 자름
      return result.trim().slice(0, 70);
    } catch (error) {
      console.error('AI Analysis (Recommendation) failed:', error);
      return '';
    }
  }
}
