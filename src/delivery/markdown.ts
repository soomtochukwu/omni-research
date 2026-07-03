import type { ResearchDeliverable } from '../research/orchestrator.js';

/**
 * Generate a clean Markdown version of the research report.
 */
export function generateMarkdown(data: ResearchDeliverable): string {
  let md = `# 🔬 Research Intelligence Report\n\n`;

  md += `## Executive Summary\n\n${data.summary}\n\n`;

  if (data.key_findings && data.key_findings.length > 0) {
    md += `## Key Findings\n\n`;
    for (const finding of data.key_findings) {
      md += `- ${finding}\n`;
    }
    md += `\n`;
  }

  if (data.detailed_analysis) {
    md += `## Detailed Analysis\n\n${data.detailed_analysis}\n\n`;
  }

  if (data.next_steps && data.next_steps.length > 0) {
    md += `## Recommended Next Steps\n\n`;
    for (const step of data.next_steps) {
      md += `- ${step}\n`;
    }
    md += `\n`;
  }

  if (data.call_to_action) {
    md += `## Call to Action\n\n`;
    md += `**Primary Recommendation:** ${data.call_to_action.primary}\n\n`;
    md += `**Secondary/Alternative:** ${data.call_to_action.secondary}\n\n`;
    md += `**Target Timeline:** ${data.call_to_action.timeline}\n\n`;
  }

  md += `## Verified Sources & Provenance\n\n`;
  md += `| Source Title | URL | Relevance | Content Hash |\n`;
  md += `| :--- | :--- | :---: | :--- |\n`;
  for (const source of data.sources) {
    const shortHash = source.content_hash.slice(0, 10) + '...';
    md += `| ${source.title} | [Link](${source.url}) | ${source.relevance_score}% | \`${shortHash}\` |\n`;
  }
  md += `\n`;

  md += `**On-chain Evidence Hash:** \`${data.evidence_hash}\`\n\n`;

  md += `---\n`;
  md += `*Research duration: ${data.metadata.research_duration_ms}ms | Total sources checked: ${data.metadata.total_sources_checked}*\n`;

  return md;
}
