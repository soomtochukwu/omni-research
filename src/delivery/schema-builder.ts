import type { ResearchDeliverable } from '../research/orchestrator.js';

/**
 * Format the deliverable matching the registered schema on agent.croo.network.
 */
export function buildSchemaDeliverable(data: ResearchDeliverable): Record<string, any> {
  return {
    summary: data.summary,
    key_findings: data.key_findings,
    detailed_analysis: data.detailed_analysis || '',
    sources: data.sources.map(s => ({
      url: s.url,
      title: s.title,
      relevance_score: s.relevance_score,
      content_hash: s.content_hash,
    })),
    confidence_score: data.confidence_score,
    next_steps: data.next_steps,
    call_to_action: data.call_to_action ? {
      primary: data.call_to_action.primary,
      secondary: data.call_to_action.secondary,
      timeline: data.call_to_action.timeline,
    } : undefined,
    evidence_hash: data.evidence_hash,
    metadata: {
      total_sources_checked: data.metadata.total_sources_checked,
      sources_cited: data.metadata.sources_cited,
      research_duration_ms: data.metadata.research_duration_ms,
    },
    pdf_download_key: data.pdf_download_key || '',
  };
}
