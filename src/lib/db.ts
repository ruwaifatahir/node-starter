import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getBoostOrders = async () => {
  const boostOrders = await prisma.boostOrder.findMany({
    where: {
      paymentStatus: "CONFIRMED",
      boostEndsAt: {
        not: null,
        gt: new Date(),
      },
    },
  });
  return boostOrders;
};

export const getBotGroups = async () => {
  const botGroups = await prisma.botGroup.findMany({
    where: {
      isActive: true,
      tokenAddress: {
        not: null,
      },
    },
  });
  return botGroups;
};

export const checkProcessedAlert = async (
  txHash: string,
  tokenAddress: string,
  destination: string
) => {
  const alert = await prisma.processedAlert.findFirst({
    where: {
      txHash,
      tokenAddress,
      destination,
    },
  });
  return !!alert;
};

export const markAlertProcessed = async (
  txHash: string,
  tokenAddress: string,
  destination: string
) => {
  await prisma.processedAlert.create({
    data: {
      txHash,
      tokenAddress,
      destination,
    },
  });
};
