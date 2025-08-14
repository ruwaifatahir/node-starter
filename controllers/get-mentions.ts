import { z } from "zod";
import { Request, Response } from "express";
import { Scraper, SearchMode } from "agent-twitter-client";

const querySchema = z.object({
  handle: z.string().min(1, "handle is required"),
  hours: z.coerce.number().int().min(1).max(168).default(24),
  count: z.coerce.number().int().min(1).max(100).default(50),
});

type Mention = {
  tweetId: string;
  userHandle: string;
  tweetText: string;
  timestamp: Date;
  userProfile: {
    name?: string;
    username?: string;
    userId?: string;
  };
  originalTweetId: string | null;
  isReply: boolean;
  likes: number;
  retweets: number;
  replies: number;
};

export const getMentions = (scraper: Scraper) => {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      if (!scraper) {
        res.status(503).json({ error: "Twitter service unavailable" });
        return;
      }

      const { handle, hours, count } = querySchema.parse(req.query);

      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const mentions: Mention[] = [];

      const query = `@${handle}`;
      const maxTweets = Math.min(count, 100);

      for await (const tweet of scraper.searchTweets(
        query,
        maxTweets,
        SearchMode.Latest
      ) as any) {
        const tweetTime: Date | undefined = (tweet as any).timeParsed;
        if (tweetTime && tweetTime >= cutoffTime) {
          if ((tweet as any).username !== handle) {
            mentions.push({
              tweetId: String((tweet as any).id),
              userHandle: (tweet as any).username,
              tweetText: (tweet as any).text,
              timestamp:
                (tweet as any).timeParsed ||
                new Date(Number((tweet as any).timestamp) * 1000),
              userProfile: {
                name: (tweet as any).name,
                username: (tweet as any).username,
                userId: (tweet as any).userId,
              },
              originalTweetId: (tweet as any).inReplyToStatusId || null,
              isReply: Boolean((tweet as any).isReply) || false,
              likes: Number((tweet as any).likes) || 0,
              retweets: Number((tweet as any).retweets) || 0,
              replies: Number((tweet as any).replies) || 0,
            });
          }
        }
      }

      res.json({
        success: true,
        handle,
        hours,
        mentions,
        totalMentions: mentions.length,
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

      console.error("Error fetching mentions:", error?.message || error);
      res.status(500).json({
        error: "Failed to fetch mentions",
        message: error?.message || "Unknown error",
      });
    }
  };
};
