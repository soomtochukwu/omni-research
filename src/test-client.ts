import 'dotenv/config';
import { AgentClient, Config, EventType } from '@croo-network/sdk';
import { logger } from './utils/logger.js';

// Configuration
const configData: Config = {
  baseURL: process.env.CROO_API_URL || 'https://api.croo.network',
  wsURL: process.env.CROO_WS_URL || 'wss://api.croo.network/ws',
};

const sdkKey = process.env.CROO_SDK_KEY || '';
const serviceId = process.env.TEST_SERVICE_ID || process.env.CROO_QUICK_SERVICE_ID || '';
const testTopic = process.env.TEST_TOPIC || 'The future of decentralized agentic protocols on Base L2';

if (!sdkKey) {
  logger.error('Error: CROO_SDK_KEY is not defined in your environment variables.');
  process.exit(1);
}

if (!serviceId) {
  logger.error('Error: TEST_SERVICE_ID or CROO_QUICK_SERVICE_ID must be specified.');
  process.exit(1);
}

async function runTestClient() {
  logger.info(`Starting Test Client...`);
  logger.info(`API Endpoint: ${configData.baseURL}`);
  logger.info(`Service ID: ${serviceId}`);
  logger.info(`Topic: "${testTopic}"`);

  const client = new AgentClient(configData, sdkKey);
  const stream = await client.connectWebSocket();

  logger.info('WebSocket connection established. Listening for order lifecycle events...');

  let activeNegotiationId = '';
  let activeOrderId = '';

  // Listen for order creation
  stream.on(EventType.OrderCreated, async (event) => {
    if (event.negotiation_id === activeNegotiationId) {
      activeOrderId = event.order_id!;
      logger.info(`✨ OrderCreated: Linked Order ID is ${activeOrderId}`);
      
      // Pay the order
      try {
        logger.info(`Paying for order ${activeOrderId}...`);
        const payResult = await client.payOrder(activeOrderId);
        logger.info(`💸 Order Paid successfully! Tx Hash: ${payResult.txHash}`);
      } catch (err: any) {
        logger.error(`Failed to pay order: ${err.message}`);
      }
    }
  });

  // Listen for order completion
  stream.on(EventType.OrderCompleted, async (event) => {
    if (event.order_id === activeOrderId) {
      logger.info(`🏁 OrderCompleted: Order ${activeOrderId} has settled!`);
      try {
        logger.info('Retrieving delivery contents...');
        const delivery = await client.getDelivery(activeOrderId);
        logger.info('=== RECEIVED DELIVERABLE ===');
        logger.info(`Type: ${delivery.deliverableType}`);
        if (delivery.deliverableSchema) {
          logger.info(`Schema Payload: ${JSON.stringify(JSON.parse(delivery.deliverableSchema), null, 2)}`);
        }
        if (delivery.deliverableText) {
          logger.info(`Text Payload: ${delivery.deliverableText}`);
        }
        logger.info('=============================');
      } catch (err: any) {
        logger.error(`Failed to retrieve delivery: ${err.message}`);
      } finally {
        process.exit(0);
      }
    }
  });

  // Listen for negotiation rejection
  stream.on(EventType.NegotiationRejected, (event) => {
    if (event.negotiation_id === activeNegotiationId) {
      logger.error(`❌ NegotiationRejected: Provider rejected the request. Reason: ${event.reason || 'None provided'}`);
      process.exit(1);
    }
  });

  // Initiate negotiation
  logger.info('Sending negotiation request...');
  const reqPayload = {
    topic: testTopic,
    context: 'Test run triggered via local Node.js test-client script.',
  };
  
  const negotiation = await client.negotiateOrder({
    serviceId,
    requirements: JSON.stringify(reqPayload),
  });

  activeNegotiationId = negotiation.negotiationId;
  logger.info(`📥 NegotiationCreated: Request sent. Negotiation ID is ${activeNegotiationId}`);
  logger.info('Waiting for Provider (your running agent) to accept the negotiation...');
}

runTestClient().catch((err) => {
  logger.error('Fatal crash in test client:', err);
  process.exit(1);
});
