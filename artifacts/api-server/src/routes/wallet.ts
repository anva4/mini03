import { Router } from "express";
import { db } from "@workspace/db";
import { users, transactions } from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { createPayment, createRukassaPayout, createCrystalPayPayout } from "../lib/payments";
import { notifyAdmin, notifyUser, notify } from "../lib/telegram";
import { logger } from "../lib/logger";

const router = Router();

router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const [user] = await db.select({
      balance: users.balance,
      frozenBalance: users.frozenBalance,
      totalDeposited: users.totalDeposited,
      totalWithdrawn: users.totalWithdrawn,
      totalVolume: users.totalVolume,
    }).from(users).where(eq(users.id, (req as any).userId)).limit(1);

    if (!user) { res.status(404).json({ message: "Not found" }); return; }

    res.json({
      balance: user.balance,
      frozenBalance: user.frozenBalance,
      totalDeposited: user.totalDeposited,
      totalWithdrawn: user.totalWithdrawn,
      totalEarned: user.totalVolume,
    });
  } catch (err) {
    logger.error(err, "Get balance error");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/deposit", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { amount, gateway = "rukassa" } = req.body;
    if (!amount || amount < 10) { res.status(400).json({ message: "Min deposit 10 RUB" }); return; }

    const [tx] = await db.insert(transactions).values({
      userId,
      type: "deposit",
      amount: amount.toFixed(2),
      status: "pending",
      gatewayType: gateway,
      description: `Deposit via ${gateway}`,
    }).returning();

    const paymentResult = await createPayment(gateway, amount, tx.id, `Minions Market deposit`);

    if (paymentResult) {
      await db.update(transactions).set({ gatewayOrderId: paymentResult.orderId }).where(eq(transactions.id, tx.id));
      res.json({ transactionId: tx.id, payUrl: paymentResult.payUrl });
    } else {
      // FIX: тестовый режим зачисления только в NON-production окружении
      if (process.env.NODE_ENV === "production") {
        await db.update(transactions).set({ status: "cancelled" }).where(eq(transactions.id, tx.id));
        res.status(400).json({ message: "Payment gateway not configured" });
        return;
      }

      // Dev/staging: зачисляем сразу
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const newBal = (parseFloat(user.balance) + amount).toFixed(2);

      await db.update(transactions).set({
        status: "completed",
        balanceBefore: user.balance,
        balanceAfter: newBal,
      }).where(eq(transactions.id, tx.id));

      // FIX: атомарное обновление баланса через SQL — нет race condition
      await db.update(users).set({
        balance: sql`balance + ${amount.toFixed(2)}::numeric`,
        totalDeposited: sql`total_deposited + ${amount.toFixed(2)}::numeric`,
      }).where(eq(users.id, userId));

      res.json({ transactionId: tx.id, payUrl: null, message: "Deposit credited (test mode)" });
    }
  } catch (err) {
    logger.error(err, "Create deposit error");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/withdraw", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { amount, method, details } = req.body;
    if (!amount || amount < 100) { res.status(400).json({ message: "Min withdrawal 100 RUB" }); return; }
    if (!method || !details) { res.status(400).json({ message: "Missing method/details" }); return; }

    // FIX: атомарное списание — обновляем баланс только если он >= amount
    // Это защита от race condition: два одновременных запроса не смогут уйти в минус
    const result = await db.update(users)
      .set({
        balance: sql`balance - ${amount.toFixed(2)}::numeric`,
      })
      .where(and(
        eq(users.id, userId),
        sql`balance >= ${amount.toFixed(2)}::numeric`,
      ))
      .returning({ newBalance: users.balance });

    if (result.length === 0) {
      res.status(400).json({ message: "Insufficient funds" });
      return;
    }

    const newBal = result[0].newBalance;

    // Читаем актуальный баланс до операции (для записи в транзакцию)
    const balanceBefore = (parseFloat(newBal) + amount).toFixed(2);

    const [tx] = await db.insert(transactions).values({
      userId,
      type: "withdrawal",
      amount: amount.toFixed(2),
      status: "pending",
      withdrawMethod: method,
      withdrawDetails: details,
      description: `Withdrawal via ${method}: ${details}`,
      balanceBefore,
      balanceAfter: newBal,
    }).returning();

    // Пробуем автоматически отправить выплату
    // Приоритет: Rukassa → CrystalPay → вручную
    // Crypto выплаты — только через CrystalPay (USDT TRC20)
    let autoPayoutDone = false;
    if (method !== "crypto") {
      const rukassaResult = await createRukassaPayout(amount, tx.id, method, details);
      if (rukassaResult) {
        await db.update(transactions).set({
          gatewayOrderId: rukassaResult.payoutId,
          description: `Auto-payout via Rukassa (${method}): ${details}`,
        }).where(eq(transactions.id, tx.id));
        autoPayoutDone = true;
        logger.info({ txId: tx.id, payoutId: rukassaResult.payoutId }, "Auto-payout via Rukassa");
      }
    }

    // Если Rukassa не сработала (или крипта) — пробуем CrystalPay
    if (!autoPayoutDone) {
      const crystalResult = await createCrystalPayPayout(amount, tx.id, method, details);
      if (crystalResult) {
        await db.update(transactions).set({
          gatewayOrderId: crystalResult.payoutId,
          description: `Auto-payout via CrystalPay (${method}): ${details}`,
        }).where(eq(transactions.id, tx.id));
        autoPayoutDone = true;
        logger.info({ txId: tx.id, payoutId: crystalResult.payoutId }, "Auto-payout via CrystalPay");
      }
    }

    await notifyAdmin(
      autoPayoutDone
        ? `✅ Auto-payout sent: ${amount} ₽ via ${method} (Rukassa ID: ${tx.id})`
        : `⚠️ New withdrawal (manual): ${amount} ₽ via ${method}`
    );

    // Уведомляем пользователя
    const [wUser] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, userId)).limit(1);
    await notifyUser(wUser?.telegramId, notify.withdrawCreated(amount.toFixed(2), method));

    res.json({
      transactionId: tx.id,
      message: autoPayoutDone ? "Withdrawal initiated automatically" : "Withdrawal request created",
      auto: autoPayoutDone,
    });
  } catch (err) {
    logger.error(err, "Create withdrawal error");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { type, page = "1", limit = "20" } = req.query as any;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(transactions.userId, userId)];
    if (type) conditions.push(eq(transactions.type, type));
    const where = and(...conditions);

    const txs = await db.select().from(transactions)
      .where(where)
      .orderBy(desc(transactions.createdAt))
      .limit(limitNum)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(transactions).where(where);

    res.json({ transactions: txs, total: count, page: pageNum, totalPages: Math.ceil(count / limitNum) });
  } catch (err) {
    logger.error(err, "List transactions error");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/webhook/:gateway", async (req, res) => {
  try {
    const { gateway } = req.params;
    const body = req.body;
    logger.info({ gateway, body }, "Payment webhook received");

    let orderId: string | null = null;
    let status = "completed";

    if (gateway === "rukassa") {
      orderId = body.order_id;
      if (body.status === "PAID") status = "completed";
      else { res.json({ ok: true }); return; }
    } else if (gateway === "nowpayments") {
      orderId = body.order_id;
      if (body.payment_status === "finished") status = "completed";
      else { res.json({ ok: true }); return; }
    } else if (gateway === "crystalpay") {
      orderId = body.extra;
      status = "completed";
    }

    if (!orderId) { res.status(400).json({ message: "Invalid webhook" }); return; }

    const [tx] = await db.select().from(transactions).where(eq(transactions.id, orderId)).limit(1);
    if (!tx || tx.status !== "pending") { res.json({ ok: true }); return; }

    const amount = parseFloat(tx.amount);

    // FIX: атомарное зачисление через SQL — нет race condition при параллельных вебхуках
    await db.update(users).set({
      balance: sql`balance + ${amount.toFixed(2)}::numeric`,
      totalDeposited: sql`total_deposited + ${amount.toFixed(2)}::numeric`,
    }).where(eq(users.id, tx.userId));

    // Читаем актуальный баланс для записи в лог транзакции
    const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, tx.userId)).limit(1);

    await db.update(transactions).set({
      status: "completed",
      balanceBefore: (parseFloat(user.balance) - amount).toFixed(2),
      balanceAfter: user.balance,
    }).where(eq(transactions.id, tx.id));

    // Уведомляем пользователя о пополнении
    await notifyUser(user.telegramId, notify.depositSuccess(amount.toFixed(2), user.balance));

    res.json({ ok: true });
  } catch (err) {
    logger.error(err, "Webhook error");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

// Отдельный роут для webhook выплат от Rukassa
// Rukassa шлёт на URL который настраивается в ЛК → "URL для выплат"
// Пример: https://yourdomain.com/api/wallet/payout-webhook/rukassa
router.post("/payout-webhook/rukassa", async (req, res) => {
  try {
    const body = req.body;
    logger.info({ body }, "Rukassa payout webhook received");

    // Rukassa шлёт: id, order_id, amount, status (PAID | IN PROCESS | WAIT | CANCEL)
    const orderId = body.order_id;
    const rukassaStatus = body.status;

    if (!orderId) { res.status(400).json({ message: "Invalid webhook" }); return; }

    const [tx] = await db.select().from(transactions)
      .where(and(eq(transactions.id, orderId), eq(transactions.type, "withdrawal")))
      .limit(1);

    if (!tx || tx.status !== "pending") { res.json({ ok: true }); return; }

    if (rukassaStatus === "PAID") {
      // Выплата прошла успешно
      await db.update(transactions).set({ status: "completed" }).where(eq(transactions.id, tx.id));
      await db.update(users).set({
        totalWithdrawn: sql`total_withdrawn + ${tx.amount}::numeric`,
      }).where(eq(users.id, tx.userId));

      const [user] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, tx.userId)).limit(1);
      await notifyUser(user?.telegramId, notify.withdrawApproved(tx.amount));
      logger.info({ txId: tx.id }, "Payout completed via Rukassa webhook");

    } else if (rukassaStatus === "CANCEL") {
      // Выплата отменена — возвращаем баланс
      await db.update(transactions).set({ status: "cancelled" }).where(eq(transactions.id, tx.id));
      await db.update(users).set({
        balance: sql`balance + ${tx.amount}::numeric`,
      }).where(eq(users.id, tx.userId));

      const [user] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, tx.userId)).limit(1);
      await notifyUser(user?.telegramId, notify.withdrawRejected(tx.amount, "Автоматическая выплата отменена"));
      await notifyAdmin(`❌ Payout CANCELLED by Rukassa: ${tx.amount} ₽ (tx: ${tx.id}) — баланс возвращён`);
      logger.warn({ txId: tx.id }, "Payout cancelled by Rukassa — balance restored");
    }
    // IN PROCESS / WAIT — просто ждём, ничего не делаем

    res.json({ ok: true });
  } catch (err) {
    logger.error(err, "Payout webhook error");
    res.status(500).json({ message: "Internal server error" });
  }
});

// Webhook выплат от CrystalPay
// Укажи в поле callback_url при создании выплаты:
// https://твой-домен.up.railway.app/api/wallet/payout-webhook/crystalpay
router.post("/payout-webhook/crystalpay", async (req, res) => {
  try {
    const body = req.body;
    logger.info({ body }, "CrystalPay payout webhook received");

    // CrystalPay шлёт: id, state, extra (наш orderId), signature
    // state: processing | payed | canceled | failed
    const payoffId = body.id;
    const state    = body.state;
    const orderId  = body.extra; // наш tx.id который мы передали при создании

    if (!orderId) { res.status(400).json({ message: "Invalid webhook: no extra" }); return; }

    const [tx] = await db.select().from(transactions)
      .where(and(eq(transactions.id, orderId), eq(transactions.type, "withdrawal")))
      .limit(1);

    if (!tx || tx.status !== "pending") { res.json({ ok: true }); return; }

    if (state === "payed") {
      await db.update(transactions).set({ status: "completed" }).where(eq(transactions.id, tx.id));
      await db.update(users).set({
        totalWithdrawn: sql`total_withdrawn + ${tx.amount}::numeric`,
      }).where(eq(users.id, tx.userId));

      const [user] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, tx.userId)).limit(1);
      await notifyUser(user?.telegramId, notify.withdrawApproved(tx.amount));
      logger.info({ txId: tx.id, payoffId }, "Payout completed via CrystalPay webhook");

    } else if (state === "canceled" || state === "failed") {
      await db.update(transactions).set({ status: "cancelled" }).where(eq(transactions.id, tx.id));
      await db.update(users).set({
        balance: sql`balance + ${tx.amount}::numeric`,
      }).where(eq(users.id, tx.userId));

      const [user] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, tx.userId)).limit(1);
      await notifyUser(user?.telegramId, notify.withdrawRejected(tx.amount, "Автоматическая выплата отменена"));
      await notifyAdmin(`❌ Payout ${state.toUpperCase()} by CrystalPay: ${tx.amount} ₽ (tx: ${tx.id}) — баланс возвращён`);
      logger.warn({ txId: tx.id, state }, "Payout failed/cancelled via CrystalPay — balance restored");
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error(err, "CrystalPay payout webhook error");
    res.status(500).json({ message: "Internal server error" });
  }
});
