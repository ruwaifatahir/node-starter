import { Scraper } from "agent-twitter-client";
import { getTwitterCookies } from "./utils";

export const initTwitterScraper = async (): Promise<Scraper> => {
  try {
    const scraper = new Scraper();

    // Get formatted cookie strings from utility function
    const cookieStrings = getTwitterCookies();

    // Set cookies and verify login
    await scraper.setCookies(cookieStrings);

    if (!(await scraper.isLoggedIn())) {
      throw new Error(
        "Twitter authentication failed - invalid or expired cookies"
      );
    }

    console.log("Twitter authentication successful");
    return scraper;
  } catch (error: any) {
    console.error("Twitter initialization error:", error.message);
    throw error;
  }
};
