import "dotenv/config";

import cron from "node-cron";

import whaleAlert from "./src/main";

cron.schedule("*/5 * * * *", async () => {
  try {
    await whaleAlert();
  } catch (err) {
    console.error("Scheduled job error:", err);
  }
});

(async () => {
  try {
    await whaleAlert();
  } catch (err) {
    console.error("Startup job error:", err);
  }
})();
