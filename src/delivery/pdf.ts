import puppeteer from 'puppeteer';
import type { ResearchDeliverable } from '../research/orchestrator.js';
import { generateMarkdown } from './markdown.js';
import { logger } from '../utils/logger.js';

/**
 * Generate a styled PDF report from research deliverable using Puppeteer.
 */
export async function generatePDF(data: ResearchDeliverable): Promise<Buffer> {
  logger.info('Generating PDF report...');
  
  // Basic markdown to simple HTML parser (replacing only basic syntax needed here)
  const md = generateMarkdown(data);
  
  // Simple conversion to keep the code light and robust
  let htmlContent = md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$2</h2>')
    .replace(/^### (.*$)/gim, '<h3>$3</h3>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .split('\n')
    .map(line => {
      if (line.trim().startsWith('<li>')) return line;
      if (line.trim().startsWith('<h') || line.trim().startsWith('<li') || line.trim() === '') return line;
      return `<p>${line}</p>`;
    })
    .join('\n');

  // Fix table generation tags
  htmlContent = htmlContent.replace(/\| (.*?) \|/g, '<td>$1</td>');
  // Just wrapping lists
  htmlContent = htmlContent.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

  const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Research Intelligence Report</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          padding: 40px;
        }
        h1 {
          color: #1a365d;
          font-size: 28px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 10px;
        }
        h2 {
          color: #2b6cb0;
          font-size: 20px;
          margin-top: 30px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 5px;
        }
        p, li {
          font-size: 14px;
        }
        ul {
          padding-left: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #cbd5e0;
          padding: 8px 12px;
          text-align: left;
          font-size: 12px;
        }
        th {
          background-color: #f7fafc;
        }
        code {
          background-color: #edf2f7;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
        }
        .footer {
          margin-top: 50px;
          font-size: 11px;
          color: #718096;
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(fullHTML, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '20mm',
      right: '20mm'
    }
  });

  await browser.close();
  logger.info('PDF generated successfully');
  return Buffer.from(pdfBuffer);
}
