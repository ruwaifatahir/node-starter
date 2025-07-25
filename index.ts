import "dotenv/config";

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const articles = await prisma.article.delete({
    where: {
      id: 2,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
