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
      const prompt = `당신은 퍼포먼스 마케팅 전문가입니다.
매체별 최우수 및 최하위 캠페인 명단을 분석하여 300자 이내의 한글 전략 보고를 작성해 주세요.

[데이터]
${JSON.stringify(ranks)}

[분석 요청]
1. 현재 잘하고 있는 매체의 특징을 짚어주세요.
2. 최하위 캠페인들의 공통적인 패착이나 개선 포인트를 제언하십시오.
3. 향후 예산 운용에 대한 핵심 전략을 제시하십시오.
* 반드시 300자 이내로 작성하십시오.`;

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
      const prompt = `당신은 마케팅 믹스 최적화 전문가입니다.
Random Forest 모델의 채널 추천 결과에 대해 300자 이내의 한글 분석을 작성해 주세요.

[데이터]
- 모델 정확도: ${accuracy}
- 매체별 성능 지표: ${JSON.stringify(metrics)}
- 추천 시뮬레이션: ${JSON.stringify(sample)}

[분석 요청]
1. 모델의 추천 정확성에 대해 코멘트하십시오.
2. 현재 추천되는 매체가 왜 최우선 순위인지 설명하십시오.
3. 마케터가 이 데이터를 어떻게 활용해야 할지 제안하십시오.
* 반드시 300자 이내로 작성하십시오.`;

      return await this.call(prompt);
    } catch (error) {
      console.error('AI Analysis (RF) failed:', error);
      return '매체 추천 모델 분석 중 오류가 발생했습니다.';
    }
  }
}
