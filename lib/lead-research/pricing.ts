import { LeadResearchSku } from '@/types/lead-research';

export interface SkuPricingConfig {
  sku: LeadResearchSku;
  label: string;
  currency: 'USD';
  price_cents: number;
  api_budget_micro_usd: number | null;
  delivery_hours?: number;
  human_review_required: boolean;
  pricing_version: string;
}

export const CURRENT_PRICING_VERSION = '2026-10-v1';

export const SKU_CATALOG: Record<LeadResearchSku, SkuPricingConfig> = {
  M: {
    sku: 'M',
    label: 'Ricerca M',
    currency: 'USD',
    price_cents: 1900,
    api_budget_micro_usd: 5_000_000, // 5.00 USD
    human_review_required: false,
    pricing_version: CURRENT_PRICING_VERSION,
  },
  XL: {
    sku: 'XL',
    label: 'Ricerca XL',
    currency: 'USD',
    price_cents: 4900,
    api_budget_micro_usd: 15_000_000, // 15.00 USD
    human_review_required: false,
    pricing_version: CURRENT_PRICING_VERSION,
  },
  AD_HOC: {
    sku: 'AD_HOC',
    label: 'Ricerca AD-HOC',
    currency: 'USD',
    price_cents: 8900,
    api_budget_micro_usd: null, // Strictly null: NO automated AI spend permitted
    delivery_hours: 24,
    human_review_required: true,
    pricing_version: CURRENT_PRICING_VERSION,
  },
};

/**
 * Provider API Rates (in micro-USD)
 * 1 USD = 1,000,000 micro-USD
 */
export const API_RATES = {
  // Tavily Pay-as-you-go: $0.008 / credit = 8,000 micro-USD
  TAVILY_MICRO_PER_CREDIT: 8000,
  TAVILY_SEARCH_CREDITS: 2, // Advanced search = 2 credits (16,000 micro-USD)
  TAVILY_EXTRACT_CREDITS_PER_5_URLS: 2, // 2 credits per 5 URLs

  // OpenAI standard model rates (e.g. gpt-4o-mini or standard Sol estimate)
  // Input: $0.150 per 1M tokens ($0.00000015 / token = 0.15 µUSD / token)
  // Output: $0.600 per 1M tokens ($0.00000060 / token = 0.60 µUSD / token)
  // Or conservative fallback ceiling ($2/M input = 2 µUSD, $10/M output = 10 µUSD):
  OPENAI_INPUT_MICRO_PER_TOKEN: 2,
  OPENAI_OUTPUT_MICRO_PER_TOKEN: 10,
};

/**
 * Calculates theoretical maximum cost for an OpenAI call before executing it.
 */
export function estimateMaxOpenAiCostMicro(
  estimatedInputTokens: number,
  maxOutputTokens: number
): number {
  const inputCost = Math.ceil(estimatedInputTokens * API_RATES.OPENAI_INPUT_MICRO_PER_TOKEN);
  const outputCost = Math.ceil(maxOutputTokens * API_RATES.OPENAI_OUTPUT_MICRO_PER_TOKEN);
  return inputCost + outputCost;
}

/**
 * Calculates theoretical maximum cost for Tavily operations.
 */
export function estimateTavilySearchCostMicro(): number {
  return API_RATES.TAVILY_SEARCH_CREDITS * API_RATES.TAVILY_MICRO_PER_CREDIT; // 16,000 micro-USD
}

export function estimateTavilyExtractCostMicro(urlCount: number): number {
  const batches = Math.ceil(Math.max(1, urlCount) / 5);
  return batches * API_RATES.TAVILY_EXTRACT_CREDITS_PER_5_URLS * API_RATES.TAVILY_MICRO_PER_CREDIT;
}
