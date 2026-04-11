/**
 * deal-autocomplete.ts
 *
 * Фоновый job: каждые 5 минут проверяет сделки с истёкшим autoCompleteAt
 * и автоматически их завершает — зачисляет деньги продавцу.
 *
 * Статусы которые могут авто-завершиться: "paid" | "delivered"
 *
 * Подключить в index.ts:
 *   import { startDealAutoCompleteJob } from "./lib/deal-autocomplete";
 *   startDealAutoCompleteJob();
 */

import { db } from "@workspace/db";
import { deals, users, products, transactions } from "@workspace/db/schema";
import { eq, and, lte, inArray, sql } from "drizzle-orm";
import { notifyUser, notifyAdmin, notify } from "./telegram";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 минут

async function processExpiredDeals(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  try {
    // Находим все сделки, у которых истёк таймер и статус ещё не финальный
    const expired = await db
      .select()
      .from(deals)
      .where(
        and(
          inArray(deals.status, ["paid", "delivered"]),
          lte(deals.autoCompleteAt, now),
        ),
      )
      .limit(50);

    if (expired.length === 0) return;

    logger.info({ count: expired.length }, "Auto-completing expired deals");

    for (const deal of expired) {
      try {
        const sellerAmount = parseFloat(deal.sellerAmount);

        // Переводим в completed
        await db
          .update(deals)
          .set({ status: "completed", buyerConfirmed: false })
          .where(eq(deals.id, deal.id));

        // Зачисляем деньги продавцу атомарно
        await db
          .update(users)
          .set({
            balance: sql`balance + ${sellerAmount.toFixed(2)}::numeric`,
            totalSales: sql`total_sales + 1`,
            totalVolume: sql`total_volume + ${sellerAmount.toFixed(2)}::numeric`,
          })
          .where(eq(users.id, deal.sellerId));

        // Размораживаем у покупателя
        await db
          .update(users)
          .set({
            frozenBalance: sql`GREATEST(0, frozen_balance - ${deal.amount}::numeric)`,
          })
          .where(eq(users.id, deal.buyerId));

        // Записываем транзакцию для продавца
        await db.insert(transactions).values({
          userId: deal.sellerId,
          type: "sale_revenue",
          amount: sellerAmount.toFixed(2),
          status: "completed",
          description: `Auto-completed sale for deal #${deal.dealNumber}`,
        });

        // Обновляем счётчик продаж товара
        await db
          .update(products)
          .set({ soldCount: sql`${products.soldCount} + 1` })
          .where(eq(products.id, deal.productId));

        // Уведомляем обоих участников
        const [[sellerUser], [buyerUser], [productRow]] = await Promise.all([
          db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, deal.sellerId)).limit(1),
          db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, deal.buyerId)).limit(1),
          db.select({ title: products.title }).from(products).where(eq(products.id, deal.productId)).limit(1),
        ]);

        const productTitle = productRow?.title || "Товар";

        await notifyUser(
          sellerUser?.telegramId,
          notify.dealCompletedSeller(deal.dealNumber, productTitle, sellerAmount.toFixed(2)),
        );
        await notifyUser(
          buyerUser?.telegramId,
          `✅ Сделка #${deal.dealNumber} (${productTitle}) автоматически завершена — время подтверждения истекло.`,
        );

        logger.info({ dealId: deal.id, dealNumber: deal.dealNumber }, "Deal auto-completed");
      } catch (err) {
        // Логируем ошибку по конкретной сделке, но продолжаем цикл
        logger.error({ err, dealId: deal.id }, "Failed to auto-complete deal");
      }
    }

    if (expired.length > 0) {
      await notifyAdmin(`🤖 Авто-завершено сделок: ${expired.length} (таймер истёк)`);
    }
  } catch (err) {
    logger.error(err, "Deal auto-complete job error");
  }
}

export function startDealAutoCompleteJob(): void {
  // Первый запуск через 2 минуты после старта (дать время БД подняться)
  setTimeout(() => {
    processExpiredDeals();
    setInterval(processExpiredDeals, POLL_INTERVAL_MS);
  }, 2 * 60 * 1000);

  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Deal auto-complete job started");
}
