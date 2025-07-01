import { TRENDING_CHANNEL_ID, DEXSCREENER_API__URL } from "./constants";
import { MediaType } from "@prisma/client";
import { Telegraf } from "telegraf";
import { HttpsProxyAgent } from "https-proxy-agent";
import { createChartLink, extractTicker } from "./utils";
import { PoolData } from "./types";

// // Configure proxy agent with SSL validation disabled for development
const agent =
  process.env.NODE_ENV === "development" && process.env.HTTPS_PROXY
    ? new HttpsProxyAgent(process.env.HTTPS_PROXY, {
        rejectUnauthorized: false,
      })
    : undefined;

const bot = new Telegraf(process.env.BOT_TOKEN!, {
  telegram: { agent },
});

export async function getPoolData(poolId: string): Promise<PoolData | null> {
  try {
    const response = await fetch(`${DEXSCREENER_API__URL}/sonic/${poolId}`);
    const data = await response.json();
    return data.pairs?.[0] || null;
  } catch (error) {
    console.error(
      "Error fetching pool data:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}

export const sendAlertToGroup = async (
  groupId: string,
  message: string,
  mediaUrl: string,
  mediaType: MediaType,
  tokenAddress: string,
  tokenSymbol: string
) => {
  try {
    const keyboard = [
      [
        {
          text: `Buy ${tokenSymbol}`,
          url: createChartLink(tokenAddress),
        },
      ],
    ];
    switch (mediaType) {
      case MediaType.PHOTO:
        await bot.telegram.sendPhoto(groupId, mediaUrl, {
          caption: message,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: keyboard,
          },
        });
        break;
      case MediaType.VIDEO:
        await bot.telegram.sendVideo(groupId, mediaUrl, {
          caption: message,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: keyboard,
          },
        });
        break;
      case MediaType.ANIMATION:
        await bot.telegram.sendAnimation(groupId, mediaUrl, {
          caption: message,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: keyboard,
          },
        });
        break;
      default:
        await bot.telegram.sendMessage(groupId, message, {
          parse_mode: "Markdown",
          link_preview_options: { is_disabled: true },
          reply_markup: {
            inline_keyboard: keyboard,
          },
        });
    }
  } catch (error) {
    console.log(error);
  }
};

export const sendAlertToChannel = async (
  message: string,
  tokenAddress: string,
  tokenSymbol: string
) => {
  try {
    const keyboard = [
      [
        {
          text: `Buy ${tokenSymbol}`,
          url: createChartLink(tokenAddress),
        },
      ],
    ];
    await bot.telegram.sendMessage(TRENDING_CHANNEL_ID, message, {
      parse_mode: "Markdown",
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  } catch (error) {
    console.log(error);
  }
};
