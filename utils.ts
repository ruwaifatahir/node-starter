import { Request, Response, NextFunction } from "express";

const API_KEYS = process.env.API_KEYS ? process.env.API_KEYS.split(",") : [];

export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If no API keys configured, skip authentication
  if (API_KEYS.length === 0) {
    return next();
  }

  const apiKey = req.headers["x-api-key"] || req.headers["authorization"];

  if (!apiKey || !API_KEYS.includes(apiKey as string)) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  next();
};

export const getTwitterCookies = () => {
  // Define required cookies
  const requiredCookies = [
    {
      name: "auth_token",
      value: process.env.TWITTER_COOKIES_AUTH_TOKEN,
      httpOnly: true,
    },
    {
      name: "ct0",
      value: process.env.TWITTER_COOKIES_CT0,
    },
    {
      name: "guest_id",
      value: process.env.TWITTER_COOKIES_GUEST_ID,
    },
  ];

  // Validate all required cookies exist
  for (const cookie of requiredCookies) {
    if (!cookie.value) {
      throw new Error(`Missing required Twitter cookie: ${cookie.name}`);
    }
  }

  // Format cookies for Twitter
  return requiredCookies.map(
    (cookie) =>
      `${cookie.name}=${cookie.value}; Domain=.twitter.com; Path=/; Secure; ${
        cookie.httpOnly ? "HttpOnly;" : ""
      } SameSite=Lax`
  );
};
