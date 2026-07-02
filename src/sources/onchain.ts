import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface OnchainResult {
  url: string;
  title: string;
  content: string;
  dataType: 'tvl' | 'protocol' | 'chain' | 'token';
  retrievedAt: string;
}

/**
 * Fetch DeFi TVL data from DeFiLlama.
 */
export async function fetchTVL(protocol?: string): Promise<OnchainResult[]> {
  try {
    if (protocol) {
      const resp = await axios.get(`https://api.llama.fi/protocol/${protocol}`);
      const data = resp.data;
      return [
        {
          url: `https://defillama.com/protocol/${protocol}`,
          title: `${data.name} — DeFi Protocol Data`,
          content: JSON.stringify({
            name: data.name,
            tvl: data.tvl,
            chain: data.chain,
            category: data.category,
            chains: data.chains,
            change_1d: data.change_1d,
            change_7d: data.change_7d,
          }),
          dataType: 'protocol',
          retrievedAt: new Date().toISOString(),
        },
      ];
    }

    const resp = await axios.get('https://api.llama.fi/protocols');
    const top10 = resp.data.slice(0, 10);
    return top10.map((p: any) => ({
      url: `https://defillama.com/protocol/${p.slug}`,
      title: `${p.name} — TVL: $${(p.tvl / 1e9).toFixed(2)}B`,
      content: JSON.stringify({
        name: p.name,
        tvl: p.tvl,
        chain: p.chain,
        category: p.category,
        change_1d: p.change_1d,
        change_7d: p.change_7d,
      }),
      dataType: 'tvl' as const,
      retrievedAt: new Date().toISOString(),
    }));
  } catch (err: any) {
    logger.error(`DeFiLlama fetch failed: ${err.message}`);
    return [];
  }
}

/**
 * Fetch chain-level TVL data from DeFiLlama.
 */
export async function fetchChainTVL(chain?: string): Promise<OnchainResult[]> {
  try {
    const resp = await axios.get('https://api.llama.fi/v2/chains');
    let chains = resp.data;

    if (chain) {
      chains = chains.filter((c: any) =>
        c.name.toLowerCase().includes(chain.toLowerCase()),
      );
    } else {
      chains = chains.slice(0, 10);
    }

    return chains.map((c: any) => ({
      url: `https://defillama.com/chain/${c.name}`,
      title: `${c.name} — Chain TVL: $${(c.tvl / 1e9).toFixed(2)}B`,
      content: JSON.stringify({
        name: c.name,
        tvl: c.tvl,
        tokenSymbol: c.tokenSymbol,
        gecko_id: c.gecko_id,
      }),
      dataType: 'chain' as const,
      retrievedAt: new Date().toISOString(),
    }));
  } catch (err: any) {
    logger.error(`Chain TVL fetch failed: ${err.message}`);
    return [];
  }
}

/**
 * Fetch on-chain data based on topic keywords.
 */
export async function searchOnchain(topic: string): Promise<OnchainResult[]> {
  const lower = topic.toLowerCase();

  // Try to extract a protocol or chain name from the topic
  if (lower.includes('tvl') || lower.includes('defi') || lower.includes('protocol')) {
    const [tvl, chains] = await Promise.all([fetchTVL(), fetchChainTVL()]);
    return [...tvl, ...chains];
  }

  // Default: return top DeFi data
  return fetchTVL();
}
