import { Resend } from 'resend';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type { ResearchDeliverable } from '../research/orchestrator.js';
import { generateMarkdown } from './markdown.js';

/**
 * Send the research report via Resend email.
 */
export async function sendEmail(
  toEmail: string,
  data: ResearchDeliverable,
  pdfBuffer?: Buffer | null
): Promise<void> {
  if (!config.resend.apiKey) {
    logger.warn('Resend API key not set — skipping email delivery');
    return;
  }

  const resend = new Resend(config.resend.apiKey);
  const markdownReport = generateMarkdown(data);
  // Basic markdown to HTML converter for email body
  const htmlReport = markdownReport
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$2</h2>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .split('\n')
    .map(line => line.trim().startsWith('<') ? line : `<p>${line}</p>`)
    .join('\n');

  try {
    logger.info(`Sending email report to ${toEmail}...`);
    
    const attachments: any[] = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `Research_Report_${Date.now()}.pdf`,
        content: pdfBuffer,
      });
    }

    await resend.emails.send({
      from: config.resend.senderEmail,
      to: toEmail,
      subject: `🔬 Verifiable Research Intelligence Report: ${data.summary.slice(0, 50)}...`,
      html: htmlReport,
      attachments,
    });

    logger.info(`Email sent successfully to ${toEmail}`);
  } catch (err: any) {
    logger.error(`Failed to send email to ${toEmail}: ${err.message}`);
  }
}
