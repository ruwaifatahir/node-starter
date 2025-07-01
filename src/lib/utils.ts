import { BoostOrder, BotGroup } from "@prisma/client";
import { NormalizedData, Swap, V2Swap, V3Swap } from "./types";
import { BOOST_ORDER_MIN_BUY, SONAR_TOKEN_ADDRESS } from "./constants";

export const normalizeData = (data: BoostOrder | BotGroup): NormalizedData => {
  return {
    tokenAddress: data.tokenAddress || "",
    emoji: data.emoji || "",
    website: data.website || undefined,
    telegram: data.telegram || undefined,
    x: data.x || undefined,
    groupId: "groupId" in data ? data.groupId : undefined,
    minBuy: "minBuy" in data ? data.minBuy : Number(BOOST_ORDER_MIN_BUY),
    mediaUrl: "mediaUrl" in data ? data.mediaUrl! : undefined,
    mediaType: "mediaType" in data ? data.mediaType! : undefined,
  };
};

export const filterBuyTrades = (
  swaps: Swap[],
  targetTokenId: string
): Swap[] => {
  return swaps.filter((swap) => {
    const isToken0 =
      swap.pool.token0.id.toLowerCase() === targetTokenId.toLowerCase();
    const isToken1 =
      swap.pool.token1.id.toLowerCase() === targetTokenId.toLowerCase();

    if (swap.type === "V3") {
      // For V3, negative amount means tokens were received (bought)
      return (
        (isToken0 && Number(swap.amount0) < 0) ||
        (isToken1 && Number(swap.amount1) < 0)
      );
    } else {
      // For V2, amountIn > amountOut means tokens were sold, so we want the opposite
      return (
        (isToken0 && Number(swap.amount0In) < Number(swap.amount0Out)) ||
        (isToken1 && Number(swap.amount1In) < Number(swap.amount1Out))
      );
    }
  });
};

export const getTokensReceived = (trade: Swap, isToken0: boolean): number => {
  if (trade.type === "V3") {
    // For V3, we take the absolute value since negative means received
    const v3Trade = trade as V3Swap;
    return Math.abs(Number(isToken0 ? v3Trade.amount0 : v3Trade.amount1));
  } else {
    // For V2, we take the difference between out and in
    const v2Trade = trade as V2Swap;
    return isToken0
      ? Math.abs(Number(v2Trade.amount0Out) - Number(v2Trade.amount0In))
      : Math.abs(Number(v2Trade.amount1Out) - Number(v2Trade.amount1In));
  }
};

export const getTopBalance = (balances: any) => {
  return balances.reduce((max: any, balance: any) =>
    balance.value > max.value ? balance : max
  );
};

export const extractTicker = (coin: string) => {
  const parts = coin.split("::");

  return parts.length >= 3 ? parts[2] : "Unknown";
};

export const formatTokenAmount = (amount: number, decimals = 6) => {
  const formattedAmount = (amount / Math.pow(10, decimals)).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
  return formattedAmount;
};

export const formatUsd = (amount: number) => {
  if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(2)}B`;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
};

export const formatWalletStats = (stats: any) => {
  const winRate = Number((stats.winRate * 100).toFixed(2));
  const totalTrades = stats.totalTrades;
  const pnlStatus = stats.pnl >= 0 ? "Positive" : "Negative";
  const volume = formatUsd(stats.volume);
  const avgTrade = formatUsd(stats.volume / stats.totalTrades);

  return { winRate, totalTrades, pnlStatus, volume, avgTrade };
};

export const formatLinks = (
  website: string,
  telegram: string,
  xLink: string,
  chart: string
) => {
  const links = [];

  if (website) links.push(`[Website](${website})`);
  if (telegram) links.push(`[Telegram](${telegram})`);
  if (xLink) links.push(`[Twitter](${xLink})`);
  if (chart) links.push(`[Chart](${chart})`);

  return links.length > 0 ? `\n🔗 ${links.join(" | ")}` : "";
};

export const truncateAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const createAddressLink = (address: string) => {
  const truncated = truncateAddress(address);
  return `[${truncated}](https://sonicscan.org/account/${address})`;
};

export const createTxLink = (txHash: string) => {
  return `[Tx](https://sonicscan.org/tx/${txHash})`;
};

export const createChartLink = (token: string) => {
  return `https://dexscreener.com/sonic/${token}`;
};

export const createTgLink = (name: string, link: string) => {
  if (!link) return name;
  return `[${name}](${link})`;
};

export const generateEmojis = (amount: string, emoji = "🐋") => {
  const dollarAmount =
    typeof amount === "string"
      ? parseFloat(amount.replace(/[$,]/g, ""))
      : amount;
  const emojiCount = Math.floor(dollarAmount / 10);
  return emoji.repeat(Math.min(emojiCount, 50));
};

export const formatMessage = (
  tokenSymbol: string,
  amountPaid: string,
  tokensReceived: number,
  tokenSymbolReceived: string,
  addressLink: string,
  txLink: string,
  emojis: string,
  marketCap: number,
  price: string,
  links: string,
  telegram: string
) => {
  const formattedMessage = `${createTgLink(tokenSymbol, telegram)} Buy!

${emojis}

⬅️ Size *${amountPaid}*
➡️ Got *${tokensReceived.toLocaleString()}*  $${tokenSymbolReceived.toUpperCase()}
👤 Buyer ${addressLink} | ${txLink}
📊 MC *${formatUsd(marketCap)}*
🏷️ Price $${price} 

Powered by [Sonar](${createChartLink(SONAR_TOKEN_ADDRESS)})
${links}`;

  return formattedMessage;
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
