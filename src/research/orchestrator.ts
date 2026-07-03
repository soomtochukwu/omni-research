import { createPlan } from './planner.js';
import { gather, type GatheredData } from './gatherer.js';
import { synthesize } from './synthesizer.js';
import { score, type ScoredResearch } from './scorer.js';
import { computeEvidenceHash } from '../verification/evidence-bundle.js';
import { logger } from '../utils/logger.js';

export interface ResearchDeliverable {
  summary: string;
  key_findings: string[];
  detailed_analysis?: string;
  sources: Array<{
    url: string;
    title: string;
    relevance_score: number;
    content_hash: string;
  }>;
  confidence_score: number;
  next_steps: string[];
  call_to_action?: {
    primary: string;
    secondary: string;
    timeline: string;
  };
  evidence_hash: string;
  metadata: {
    total_sources_checked: number;
    sources_cited: number;
    research_duration_ms: number;
  };
  pdf_download_key?: string;
}

export interface ResearchResult {
  deliverable: ResearchDeliverable;
  pdfBuffer: Buffer | null;
  email: string | null;
  scored: ScoredResearch;
}

// Tier configuration keyed by a keyword in the serviceId
const TIERS: Record<string, { depth: string; maxSources: number; includePdf: boolean }> = {
  quick: { depth: 'shallow', maxSources: 10, includePdf: false },
  deep: { depth: 'deep', maxSources: 30, includePdf: false },
  dossier: { depth: 'deep', maxSources: 50, includePdf: true },
};

function getTier(serviceId: string) {
  for (const [key, tier] of Object.entries(TIERS)) {
    if (serviceId.toLowerCase().includes(key)) return tier;
  }
  return TIERS.deep; // default
}

/**
 * Execute the full research pipeline.
 */
export async function executeResearch(
  serviceId: string,
  requirements: Record<string, any>,
): Promise<ResearchResult> {
  const startTime = Date.now();
  const tier = getTier(serviceId);

  logger.info(`Starting research: "${requirements.topic}" (tier: ${tier.depth})`);

  // Step 1: Plan
  const plan = await createPlan(requirements.topic, {
    context: requirements.context,
    depth: tier.depth,
    focusAreas: requirements.focus_areas,
  });

  // Step 2: Gather
  const data: GatheredData = await gather(plan.queries, {
    sources: plan.recommendedSources,
    maxResults: tier.maxSources,
    topic: requirements.topic,
  });

  // Step 3: Synthesize
  const synthesis = await synthesize(requirements.topic, data, {
    includeNextSteps: true,
    includeCallToAction: true,
  });

  // Step 4: Score
  const scored = score(synthesis, data);

  // Step 5: Evidence hash
  const evidenceHash = computeEvidenceHash(data.sources);

  // Step 6: Build deliverable
  const deliverable: ResearchDeliverable = {
    summary: scored.summary,
    key_findings: scored.keyFindings,
    detailed_analysis: tier.depth !== 'shallow' ? scored.detailedAnalysis : undefined,
    sources: scored.verifiedSources.map((s) => ({
      url: s.url,
      title: s.title,
      relevance_score: s.relevance,
      content_hash: s.contentHash,
    })),
    confidence_score: scored.overallConfidence,
    next_steps: scored.nextSteps,
    call_to_action: scored.callToAction,
    evidence_hash: evidenceHash,
    metadata: {
      total_sources_checked: data.totalChecked,
      sources_cited: scored.verifiedSources.length,
      research_duration_ms: Date.now() - startTime,
    },
  };

  // Step 7: Optional PDF
  let pdfBuffer: Buffer | null = null;
  if (tier.includePdf) {
    try {
      const { generatePDF } = await import('../delivery/pdf.js');
      pdfBuffer = await generatePDF(deliverable);
    } catch (err: any) {
      logger.warn(`PDF generation failed, delivering without PDF: ${err.message}`);
    }
  }

  logger.info(
    `Research complete: ${scored.verifiedSources.length} sources, confidence=${scored.overallConfidence}%, duration=${Date.now() - startTime}ms`,
  );

  return {
    deliverable,
    pdfBuffer,
    email: requirements.email || null,
    scored,
  };
}
