import "dotenv/config";
import express from "express";
import { Scraper } from "agent-twitter-client";
import { authenticateApiKey, getTwitterCookies } from "./utils";
import { initTwitterScraper } from "./scrapper";
import { postTweet } from "./controllers/post-tweet";
import { getMentions } from "./controllers/get-mentions";
import { getConversation } from "./controllers/get-conversation";

const app = express();
const PORT = process.env.PORT || 8080;
let twitterScraper: Scraper | null = null;

app.use(express.json());

app.use("/", authenticateApiKey);

const setUpRoutes = async () => {
  app.post("/post-tweet", postTweet(twitterScraper!));
  app.get("/get-mentions", getMentions(twitterScraper!));
  app.get("/get-conversation/:tweetId", getConversation(twitterScraper!));
};

const startServer = async () => {
  twitterScraper = await initTwitterScraper();
  await setUpRoutes();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
