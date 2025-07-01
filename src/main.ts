import { getPoolData, sendAlertToChannel, sendAlertToGroup } from "./lib/api";
import { CHANNEL_MIN_BUY, LOOK_BACK_PERIOD_S } from "./lib/constants";
import {
  checkProcessedAlert,
  getBoostOrders,
  getBotGroups,
  markAlertProcessed,
} from "./lib/db";
import { findPools, getSwaps } from "./lib/graph";
import {
  createAddressLink,
  createTxLink,
  formatMessage,
  formatLinks,
  formatUsd,
  generateEmojis,
  normalizeData,
  createChartLink,
  filterBuyTrades,
  getTokensReceived,
} from "./lib/utils";

export default async () => {
  const orders = await getBoostOrders();
  const botGroups = await getBotGroups();

  const tokens = [...orders, ...botGroups].map(normalizeData);

  for (const {
    tokenAddress,
    minBuy,
    groupId,
    website,
    telegram,
    x,
    emoji,
    mediaUrl,
    mediaType,
  } of tokens) {
    const pools = await findPools(tokenAddress);
    const swaps = await getSwaps(pools, LOOK_BACK_PERIOD_S, minBuy);
    const trades = filterBuyTrades(swaps, tokenAddress);

    if (!trades || trades.length === 0) {
      console.log("No trades found");
      continue;
    }

    const poolData = await getPoolData(trades[0].pool.id);

    if (!poolData) {
      console.log("No pool data found");
      continue;
    }

    for (const [index, trade] of trades.entries()) {
      console.log(`Processing trade ${index + 1} of ${trades.length}`);

      const isChannelProcessed = await checkProcessedAlert(
        trade.transaction.id,
        tokenAddress,
        "channel"
      );

      const isGroupProcessed = groupId
        ? await checkProcessedAlert(trade.transaction.id, tokenAddress, groupId)
        : true;

      if (isChannelProcessed && isGroupProcessed) {
        console.log("Trade already processed");
        continue;
      }

      const isToken0 =
        trade.pool.token0.id.toLowerCase() === tokenAddress.toLowerCase();
      const targetToken = isToken0 ? trade.pool.token0 : trade.pool.token1;

      const amountPaid = formatUsd(Number(trade.amountUSD));
      const tokensReceived = getTokensReceived(trade, isToken0);

      const links = formatLinks(
        website!,
        telegram!,
        x!,
        createChartLink(tokenAddress)
      );

      const userAddress = trade.type === "V3" ? trade.recipient : trade.to;
      const addressLink = createAddressLink(userAddress);
      const txLink = createTxLink(trade.transaction.id);
      const emojis = generateEmojis(trade.amountUSD, emoji);

      const message = formatMessage(
        targetToken.symbol,
        amountPaid,
        tokensReceived,
        targetToken.symbol,
        addressLink,
        txLink,
        emojis,
        poolData.marketCap,
        poolData.priceUsd,
        links,
        telegram!
      );

      if (!isChannelProcessed && Number(amountPaid) > CHANNEL_MIN_BUY) {
        await sendAlertToChannel(message, tokenAddress, targetToken.symbol);
        await markAlertProcessed(trade.transaction.id, tokenAddress, "channel");
      }

      if (groupId && !isGroupProcessed) {
        await sendAlertToGroup(
          groupId!,
          message,
          mediaUrl!,
          mediaType!,
          tokenAddress,
          targetToken.symbol
        );
        await markAlertProcessed(trade.transaction.id, tokenAddress, groupId);
      }
    }
  }
};
