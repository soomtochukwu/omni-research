import { AgentClient, Config, EventType } from '@croo-network/sdk';
import { config, validateConfig } from './config.js';
import { executeResearch } from './research/orchestrator.js';
import { sendEmail } from './delivery/email.js';
import { buildSchemaDeliverable } from './delivery/schema-builder.js';
import { logger } from './utils/logger.js';

export async function runProvider() {
  validateConfig();

  const sdkConfig: Config = {
    baseURL: config.croo.apiUrl,
    wsURL: config.croo.wsUrl,
  };

  logger.info(`Initializing AgentClient with URL: ${config.croo.apiUrl}`);
  const client = new AgentClient(sdkConfig, config.croo.sdkKey);

  logger.info('Connecting to CROO WebSocket stream...');
  const stream = await client.connectWebSocket();

  // 1. Negotiation Received
  stream.on(EventType.NegotiationCreated, async (event) => {
    const negotiationId = event.negotiation_id;
    if (!negotiationId) {
      logger.warn('Received NegotiationCreated event without negotiation_id');
      return;
    }

    logger.info(`📥 NegotiationCreated: ${negotiationId}`);
    
    try {
      const negotiation = await client.getNegotiation(negotiationId);
      logger.info(`Negotiation info: serviceId=${negotiation.serviceId}`);

      // Parse requirements string
      let requirements: Record<string, any> = {};
      if (negotiation.requirements) {
        try {
          requirements = JSON.parse(negotiation.requirements);
        } catch {
          requirements = { topic: negotiation.requirements };
        }
      }

      // Auto-accept topic research negotiations
      const topic = requirements.topic;
      if (!topic) {
        logger.warn(`Negotiation ${negotiation.negotiationId} missing 'topic' in requirements. Rejecting.`);
        await client.rejectNegotiation(negotiation.negotiationId, "Requirement 'topic' is required");
        return;
      }

      logger.info(`Accepting negotiation ${negotiation.negotiationId}...`);
      await client.acceptNegotiation(negotiation.negotiationId);
      logger.info(`✅ Negotiation accepted: ${negotiation.negotiationId}`);
    } catch (err: any) {
      logger.error(`Failed to handle negotiation ${negotiationId}: ${err.message}`);
    }
  });

  // 2. Order Paid (Start Work)
  stream.on(EventType.OrderPaid, async (event) => {
    const orderId = event.order_id;
    if (!orderId) {
      logger.warn('Received OrderPaid event without order_id');
      return;
    }

    logger.info(`💰 OrderPaid: ${orderId}`);

    try {
      const order = await client.getOrder(orderId);
      
      // Fetch corresponding negotiation to get requirements
      const negotiation = await client.getNegotiation(order.negotiationId);
      let requirements: Record<string, any> = {};
      if (negotiation.requirements) {
        try {
          requirements = JSON.parse(negotiation.requirements);
        } catch {
          requirements = { topic: negotiation.requirements };
        }
      }

      if (!requirements.topic) {
        throw new Error("Missing 'topic' in order requirements");
      }

      // Execute research pipeline
      const researchResult = await executeResearch(order.serviceId, requirements);

      // Handle PDF generation and upload if applicable
      if (researchResult.pdfBuffer) {
        logger.info(`Uploading PDF deliverable for order ${order.orderId}...`);
        const fileKey = await client.uploadFile(
          `Research_Report_${order.orderId}.pdf`,
          researchResult.pdfBuffer
        );
        logger.info(`PDF uploaded. Key: ${fileKey}`);
        researchResult.deliverable.pdf_download_key = fileKey;
      }

      // Deliver via CROO
      const schemaDeliverable = buildSchemaDeliverable(researchResult.deliverable);
      logger.info(`Submitting deliverable for order ${order.orderId}...`);
      
      await client.deliverOrder(order.orderId, {
        deliverableType: 'schema',
        deliverableSchema: JSON.stringify(schemaDeliverable),
      });
      logger.info(`✅ Order delivered successfully: ${order.orderId}`);

      // Optional: Send email
      if (researchResult.email) {
        const downloadUrl = researchResult.deliverable.pdf_download_key 
          ? await client.getDownloadURL(researchResult.deliverable.pdf_download_key)
          : undefined;

        // If download url is obtained, append it to email
        if (downloadUrl) {
          researchResult.deliverable.summary += `\n\n**[Download Report PDF](${downloadUrl})** *(Link expires in 30 minutes)*`;
        }

        await sendEmail(researchResult.email, researchResult.deliverable, researchResult.pdfBuffer);
      }
    } catch (err: any) {
      logger.error(`Execution failed for order ${orderId}: ${err.message}`);
      try {
        await client.rejectOrder(orderId, `Internal error: ${err.message}`);
        logger.info(`Rejected order: ${orderId}`);
      } catch (rejectErr: any) {
        logger.error(`Failed to reject order: ${rejectErr.message}`);
      }
    }
  });

  stream.on(EventType.OrderCompleted, (event) => {
    logger.info(`💵 OrderCompleted (Settlement Cleared): ${event.order_id}`);
  });

  logger.info('🔬 OmniResearch Agent is online and listening for events.');
}
