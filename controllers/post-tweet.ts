  import { z } from "zod";
  import { Request, Response } from "express";
  import { Scraper } from "agent-twitter-client";

  const tweetSchema = z.object({
    text: z.string().min(1, "Tweet text is required").max(280, "Tweet too long"),
    reply_to_tweet_id: z.string().optional(),
  });

  export const postTweet = (scraper: Scraper) => {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const validatedData = tweetSchema.parse(req.body);
        const { text, reply_to_tweet_id } = validatedData;

        const result = await scraper.sendTweet(text, reply_to_tweet_id);
        if (result && typeof result.json === "function") {
          const tweetData = await result.json();

          const tweetId =
            tweetData?.data?.create_tweet?.tweet_results?.result?.rest_id ||
            tweetData?.data?.create_tweet?.tweet_results?.result?.legacy
              ?.id_str ||
            "unknown";

          res.status(201).json({
            success: true,
            tweetId: tweetId,
            message: reply_to_tweet_id
              ? "Reply posted successfully"
              : "Tweet posted successfully",
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Something went wrong",
          });
        }
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Validation failed",
            details: error.message,
          });
          return;
        }

        console.error("Tweet posting error:", error.message);
        res.status(500).json({
          error: "Failed to post tweet",
          message: error.message,
        });
      }
    };
  };
