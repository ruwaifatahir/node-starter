import request from "graphql-request";
import { GRAPH_API_KEY, SHADOW_CORE_SUBGRAPH_URL } from "./constants";
import { gql } from "graphql-request";
import { BasePool, PoolsResponse, Swap, SwapsResponse } from "./types";

export async function findPools(tokenAddress: string): Promise<BasePool[]> {
  const minLiquidityUSD = "5000";
  const query = gql`{
    v3: clPools(
      where: { 
        and: [
          { or: [{ token0: "${tokenAddress}" }, { token1: "${tokenAddress}" }] },
          { totalValueLockedUSD_gte: ${minLiquidityUSD} }
        ]
      }, 
      first: 100
    ) {
      id
      token0 { id symbol }
      token1 { id symbol }
      totalValueLockedUSD
      type: __typename
    }
    v2: legacyPools(
      where: { 
        and: [
          { or: [{ token0: "${tokenAddress}" }, { token1: "${tokenAddress}" }] },
          { totalValueLockedUSD_gte: ${minLiquidityUSD} }
        ]
      }, 
      first: 100
    ) {
      id
      token0 { id symbol }
      token1 { id symbol }
      totalValueLockedUSD
      type: __typename
    }
  }`;

  try {
    const data = await request<PoolsResponse>(
      SHADOW_CORE_SUBGRAPH_URL,
      query,
      {},
      { Authorization: `Bearer ${GRAPH_API_KEY}` }
    );
    const pools = [
      ...(data.v3 || []).map((p) => ({ ...p, type: "V3" as const })),
      ...(data.v2 || []).map((p) => ({ ...p, type: "V2" as const })),
    ];

    // Sort pools by liquidity
    return pools.sort(
      (a, b) => Number(b.totalValueLockedUSD) - Number(a.totalValueLockedUSD)
    );
  } catch (e: any) {
    console.error("Error finding pools:", e.message);
    return [];
  }
}

export async function getSwaps(
  pools: BasePool[],
  secondsBack = 86400,
  minUSD = 1
): Promise<Swap[]> {
  const timestamp = Math.floor(Date.now() / 1000) - secondsBack;
  const v3Pools = pools
    .filter((p): p is BasePool & { type: "V3" } => p.type === "V3")
    .map((p) => p.id);
  const v2Pools = pools
    .filter((p): p is BasePool & { type: "V2" } => p.type === "V2")
    .map((p) => p.id);

  const query = gql`{
    v3: clSwaps(
      where: { pool_in: [${v3Pools
        .map((id) => `"${id}"`)
        .join(", ")}], timestamp_gte: ${timestamp}, amountUSD_gte: "${minUSD}" }
      orderBy: timestamp
      orderDirection: desc
      first: 100
    ) {
      id timestamp amountUSD
      pool { 
        id
        token0 { symbol id } 
        token1 { symbol id }
        totalValueLockedUSD
      }
      amount0 amount1
      recipient
      transaction { id }
    }
    v2: legacySwaps(
      where: { pool_in: [${v2Pools
        .map((id) => `"${id}"`)
        .join(", ")}], timestamp_gte: ${timestamp}, amountUSD_gte: "${minUSD}" }
      orderBy: timestamp
      orderDirection: desc
      first: 100
    ) {
      id timestamp amountUSD
      pool { 
        id
        token0 { symbol id } 
        token1 { symbol id }
        totalValueLockedUSD
      }
      amount0In amount0Out amount1In amount1Out
      to
      transaction { id }
    }
  }`;

  try {
    const data = await request<SwapsResponse>(
      SHADOW_CORE_SUBGRAPH_URL,
      query,
      {},
      { Authorization: `Bearer ${GRAPH_API_KEY}` }
    );
    return [
      ...(data.v3 || []).map((s) => ({ ...s, type: "V3" as const })),
      ...(data.v2 || []).map((s) => ({ ...s, type: "V2" as const })),
    ].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  } catch (e: any) {
    console.error("Error fetching swaps:", e.message);
    return [];
  }
}
