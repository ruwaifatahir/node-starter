import { z } from "zod";
import { Request, Response } from "express";
import { Scraper } from "agent-twitter-client";

const paramsSchema = z.object({
  tweetId: z.string().min(1, "tweetId is required"),
});

const querySchema = z.object({
  handle: z.string().min(1, "handle is required"),
  scope: z.enum(["relevant", "full"]).optional().default("relevant"),
  includeRoot: z.coerce.boolean().optional().default(true),
  contextBefore: z.coerce.number().int().min(0).max(5).optional().default(1),
});

type ConversationTweet = {
  tweetId: string;
  userHandle: string;
  tweetText: string;
  timestamp: Date;
  userProfile: {
    name?: string;
    username?: string;
    userId?: string;
  };
  isReply: boolean;
  likes: number;
  retweets: number;
  replies: number;
  isYours: boolean;
};

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeHandle(rawHandle: string): string {
  return rawHandle.replace(/^@/, "").trim().toLowerCase();
}

function isMentioningHandle(text: string, normalizedHandle: string): boolean {
  if (!text) return false;
  const escaped = escapeRegExp(normalizedHandle);
  const regex = new RegExp(`@${escaped}(?![\\w])`, "i");
  return regex.test(text);
}

function filterRelevantBranch(
  tweets: ConversationTweet[],
  handle: string,
  options: { includeRoot: boolean; contextBefore: number }
): ConversationTweet[] {
  const normalizedHandle = normalizeHandle(handle);
  const firstRelevantIndex = tweets.findIndex(
    (tweet) =>
      tweet.isYours ||
      isMentioningHandle(tweet.tweetText || "", normalizedHandle)
  );

  if (firstRelevantIndex === -1) {
    return [];
  }

  const rootIndex = 0;
  const startIndex = options.includeRoot
    ? rootIndex
    : Math.max(firstRelevantIndex - options.contextBefore, rootIndex);

  return tweets.slice(startIndex);
}

export const getConversation = (scraper: Scraper) => {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      if (!scraper) {
        res.status(503).json({ error: "Twitter service unavailable" });
        return;
      }

      const { tweetId } = paramsSchema.parse(req.params);
      const { handle, scope, includeRoot, contextBefore } = querySchema.parse(
        req.query
      );

      const normalizedHandle = normalizeHandle(handle);

      const chainRaw: ConversationTweet[] = [];
      let currentTweetId: string | null = tweetId;
      let depth = 0;
      const MAX_DEPTH = 50;
      let truncated = false;

      while (currentTweetId && depth < MAX_DEPTH) {
        const tweet: any = await (scraper as any).getTweet(currentTweetId);

        if (!tweet) {
          break;
        }

        chainRaw.push({
          tweetId: String(tweet.id),
          userHandle: tweet.username,
          tweetText: tweet.text,
          timestamp:
            tweet.timeParsed || new Date(Number(tweet.timestamp) * 1000),
          userProfile: {
            name: tweet.name,
            username: tweet.username,
            userId: tweet.userId,
          },
          isReply: Boolean(tweet.isReply) || false,
          likes: Number(tweet.likes) || 0,
          retweets: Number(tweet.retweets) || 0,
          replies: Number(tweet.replies) || 0,
          isYours:
            String(tweet?.username || "").toLowerCase() === normalizedHandle,
        });

        depth += 1;

        if (!tweet.inReplyToStatusId) {
          break;
        }

        currentTweetId = String(tweet.inReplyToStatusId);
      }

      if (currentTweetId && depth >= MAX_DEPTH) {
        truncated = true;
      }

      // Oldest to newest (root first)
      const chain = chainRaw.slice().reverse();

      const conversationThread =
        scope === "full"
          ? chain
          : filterRelevantBranch(chain, handle, {
              includeRoot,
              contextBefore,
            });

      res.json({
        success: true,
        tweetId,
        handle,
        scope,
        includeRoot,
        contextBefore,
        truncated,
        maxDepth: MAX_DEPTH,
        conversationThread,
        totalTweets: conversationThread.length,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          details: error.message,
        });
        return;
      }

      console.error(
        "Error getting conversation thread:",
        error?.message || error
      );
      res.status(500).json({
        error: "Failed to get conversation thread",
        message: error?.message || "Unknown error",
      });
    }
  };
};
