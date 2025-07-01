import { MediaType } from "@prisma/client";

export type NormalizedData = {
  tokenAddress: string;
  emoji: string;
  website?: string;
  telegram?: string;
  x?: string;
  groupId?: string;
  minBuy?: number;
  mediaUrl?: string;
  mediaType?: MediaType;
};

// Token information in a pool
export interface Token {
  id: string;
  symbol: string;
}

// Base interface for both V2 and V3 pools
export interface BasePool {
  id: string;
  token0: Token;
  token1: Token;
  totalValueLockedUSD: string;
  type: "V2" | "V3";
}

// Base interface for both V2 and V3 swaps
export interface BaseSwap {
  id: string;
  timestamp: string;
  amountUSD: string;
  pool: BasePool;
  transaction: {
    id: string;
  };
  type: "V2" | "V3";
}

// V3 specific swap interface
export interface V3Swap extends BaseSwap {
  type: "V3";
  amount0: string;
  amount1: string;
  recipient: string;
}

// V2 specific swap interface
export interface V2Swap extends BaseSwap {
  type: "V2";
  amount0In: string;
  amount0Out: string;
  amount1In: string;
  amount1Out: string;
  to: string;
}

// Helper type to get the user address from either V2 or V3 swap
export type SwapRecipient<T extends Swap> = T extends V3Swap
  ? T["recipient"]
  : T extends V2Swap
  ? T["to"]
  : never;

// Union type for all swap types
export type Swap = V2Swap | V3Swap;

// GraphQL response types
export interface PoolsResponse {
  v2: BasePool[];
  v3: BasePool[];
}

export interface SwapsResponse {
  v2: V2Swap[];
  v3: V3Swap[];
}

// DexScreener Pool Data Types
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
}

interface TimeMetrics {
  m5: number;
  h1: number;
  h6: number;
  h24: number;
}

export interface PoolData {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: TimeMetrics;
  priceChange: TimeMetrics;
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info: {
    imageUrl?: string;
    header?: string;
    openGraph?: string;
    websites?: Array<any>;
    socials?: Array<any>;
  };
}
