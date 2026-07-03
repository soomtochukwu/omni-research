import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export interface ResearchPlan {
  queries: string[];
  recommendedSources: ('web' | 'academic' | 'onchain' | 'news')[];
  focusAreas: string[];
  approach: string;
}

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Decompose a research topic into actionable search queries and a plan.
 */
export async function createPlan(
  topic: string,
  options: { context?: string; depth?: string; focusAreas?: string[] } = {},
): Promise<ResearchPlan> {
  const { context, depth = 'moderate', focusAreas = [] } = options;

  const systemPrompt = `You are a research planning assistant. Given a topic, decompose it into 
specific search queries and recommend which data sources to use.

Available sources:
- web: General web search (Tavily)
- academic: Academic papers (arXiv, PubMed)
- onchain: Blockchain/DeFi data (DeFiLlama)
- news: Recent news articles.`;

  const userPrompt = `Topic: ${topic}
${context ? `Context: ${context}` : ''}
Depth: ${depth}
${focusAreas.length > 0 ? `Focus areas: ${focusAreas.join(', ')}` : ''}

Generate a research plan as JSON matching this format:
{
  "queries": ["search query 1", "search query 2"],
  "recommendedSources": ["web", "academic"],
  "focusAreas": ["area1", "area2"],
  "approach": "Brief description of the research approach"
}

Generate ${depth === 'shallow' ? '3-4' : depth === 'deep' ? '8-10' : '5-6'} search queries. Only return JSON.`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
    });

    const responseText = result.response.text();
    const plan = JSON.parse(responseText || '{}');
    logger.info(`Research plan created with ${plan.queries?.length || 0} queries`);

    return {
      queries: plan.queries || [topic],
      recommendedSources: plan.recommendedSources || ['web'],
      focusAreas: plan.focusAreas || focusAreas,
      approach: plan.approach || 'General research',
    };
  } catch (err: any) {
    logger.error(`Planning failed: ${err.message}`);
    return {
      queries: [topic],
      recommendedSources: ['web'],
      focusAreas,
      approach: 'Fallback: direct search',
    };
  }
}
