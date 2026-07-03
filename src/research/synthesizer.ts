import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type { GatheredData } from './gatherer.js';

export interface Synthesis {
  summary: string;
  keyFindings: string[];
  detailedAnalysis: string;
  nextSteps: string[];
  callToAction: {
    primary: string;
    secondary: string;
    timeline: string;
  };
}

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Synthesize gathered data into a coherent research report using LLM.
 */
export async function synthesize(
  topic: string,
  data: GatheredData,
  options: { includeNextSteps?: boolean; includeCallToAction?: boolean } = {},
): Promise<Synthesis> {
  const { includeNextSteps = true, includeCallToAction = true } = options;

  // Prepare source summaries for the LLM
  const sourceSummaries = data.sources
    .slice(0, 30)
    .map((s, i) => `[${i + 1}] ${s.title} (${s.sourceType})\nURL: ${s.url}\n${s.content.slice(0, 500)}`)
    .join('\n\n');

  const systemPrompt = `You are an expert research analyst. Synthesize the provided sources into a comprehensive, well-structured research report. 
Always cite sources by their number [1], [2], etc.
Be thorough, accurate, and actionable.
Only return valid JSON matching the format requested.`;

  const userPrompt = `Research Topic: ${topic}

Sources (${data.sources.length} gathered, ${data.totalChecked} checked):
${sourceSummaries}

Synthesize these sources into a research report as JSON:
{
  "summary": "Executive summary (300-600 words, with source citations like [1], [2])",
  "keyFindings": ["Finding 1 [1]", "Finding 2 [2,3]"],
  "detailedAnalysis": "In-depth analysis (500-1500 words, with citations)"${
    includeNextSteps
      ? ',\n  "nextSteps": ["Actionable step 1", "Step 2"]'
      : ''
  }${
    includeCallToAction
      ? ',\n  "callToAction": { "primary": "Main recommended action", "secondary": "Alternative action", "timeline": "When to act" }'
      : ''
  }
}`;

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
    const parsed = JSON.parse(responseText || '{}');
    logger.info('Research synthesis completed');

    return {
      summary: parsed.summary || '',
      keyFindings: parsed.keyFindings || [],
      detailedAnalysis: parsed.detailedAnalysis || '',
      nextSteps: parsed.nextSteps || [],
      callToAction: parsed.callToAction || {
        primary: 'Review findings and take action',
        secondary: 'Share with stakeholders',
        timeline: 'Within 1 week',
      },
    };
  } catch (err: any) {
    logger.error(`Synthesis failed: ${err.message}`);
    return {
      summary: `Research on "${topic}" gathered ${data.sources.length} sources but synthesis failed.`,
      keyFindings: [`${data.sources.length} sources were gathered for analysis`],
      detailedAnalysis: 'Synthesis could not be completed. Please review raw sources.',
      nextSteps: ['Retry research request', 'Review raw source data'],
      callToAction: {
        primary: 'Retry the research request',
        secondary: 'Review gathered sources manually',
        timeline: 'Immediately',
      },
    };
  }
}
