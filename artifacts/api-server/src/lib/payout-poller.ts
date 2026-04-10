/**
 * payout-poller.ts
 *
 * Каждые 3 минуты проверяет pending-выплаты через Rukassa getWithdrawInfo.
 * Используется как запасной вариант вместо webhook.
 *
 * Запустить из index.ts:
 *   import { startPayoutPoller } from "./lib/payout-poller";
 *   startPayoutPoller();
 */

import { db } from "@workspace/db";
import { users, transactions } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { notifyUser, notifyAdmin, notify } from "./telegram";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 минуты

async function checkRukassaPayoutStatus(rukassaId: string): Promise<string | null> {
  const apiKey = process.env.RUKASSA_API_KEY;
  const shopId = process.env.RUKASSA_SHOP_ID;
  if (!apiKey || !shopId) return null;

  try {
    const res = await fetch("https://lk.rukassa.pro/api/v1/getWithdrawInfo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_id: shopId,
        token: apiKey,
        id: rukassaId,
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    if (typeof data.status === "string") return data.status;
    return null;
  } catch (err) {
    logger.error(err, "Rukassa getWithdrawInfo failed");
    return null;
  }
}

async function checkCrystalPayPayoutStatus(payoffId: string): Promise<string | null> {
  const apiKey   = process.env.CRYSTALPAY_API_KEY;
  const shopName = process.env.CRYSTALPAY_SHOP_NAME;
  if (!apiKey || !shopName) return null;

  try {
    const res = await fetch("https://api.crystalpay.io/v3/payoff/info/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_login:  shopName,
        auth_secret: apiKey,
        id:          payoffId,
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    // state: processing | payed | canceled | failed
    if (typeof data.state === "string") return data.state;
    return null;
  } catch (err) {
    logger.error(err, "CrystalPay payoff info failed");
    return null;
  }
}

async function pollPendingPayouts(): Promise<void> {
  try {
    const pending = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "withdrawal"),
          eq(transactions.status, "pending"),
          sql`gateway_order_id IS NOT NULL`,
        ),
      )
      .limit(50);

    if (pending.length === 0) return;

    logger.info({ count: pending.length }, "Polling payout statuses");

    for (const tx of pending) {
      // Определяем шлюз по описанию транзакции
      const isCrystal = tx.description?.includes("CrystalPay");
      let finalStatus: "completed" | "cancelled" | null = null;

      if (isCrystal) {
        const state = await checkCrystalPayPayoutStatus(tx.gatewayOrderId!);
        if (state === "payed") finalStatus = "completed";
        else if (state === "canceled" || state === "failed") finalStatus = "cancelled";
      } else {
        const status = await checkRukassaPayoutStatus(tx.gatewayOrderId!);
        if (status === "PAID") finalStatus = "completed";
        else if (status === "CANCEL") finalStatus = "cancelled";
      }

      if (finalStatus === "completed") {
        await db.update(transactions).set({ status: "completed" }).where(eq(transactions.id, tx.id));
        await db.update(users).set({
          totalWithdrawn: sql`total_withdrawn + ${tx.amount}::numeric`,
        }).where(eq(users.id, tx.userId));

        const [user] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, tx.userId)).limit(1);
        await notifyUser(user?.telegramId, notify.withdrawApproved(tx.amount));
        logger.info({ txId: tx.id }, "Payout completed (poller)");

      } else if (finalStatus === "cancelled") {
        await db.update(transactions).set({ status: "cancelled" }).where(eq(transactions.id, tx.id));
        await db.update(users).set({
          balance: sql`balance + ${tx.amount}::numeric`,
        }).where(eq(users.id, tx.userId));

        const [user] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, tx.userId)).limit(1);
        await notifyUser(user?.telegramId, notify.withdrawRejected(tx.amount, "Автоматическая выплата отменена"));
        await notifyAdmin(`❌ Payout CANCELLED: ${tx.amount} ₽ (tx: ${tx.id}) — баланс возвращён`);
        logger.warn({ txId: tx.id }, "Payout cancelled (poller) — balance restored");
      }
    }
  } catch (err) {
    logger.error(err, "Payout poller error");
  }
}

export function startPayoutPoller(): void {
  // Первый запуск через минуту после старта сервера
  setTimeout(() => {
    pollPendingPayouts();
    setInterval(pollPendingPayouts, POLL_INTERVAL_MS);
  }, 60_000);

  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Payout poller started");
}
