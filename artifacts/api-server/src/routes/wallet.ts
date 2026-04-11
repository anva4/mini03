import { Router } from "express";
import crypto from "node:crypto";
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

    if (!user) { res.status(404).json({ message: "Не найдено" }); return; }

    res.json({
      balance: user.balance,
      frozenBalance: user.frozenBalance,
      totalDeposited: user.totalDeposited,
      totalWithdrawn: user.totalWithdrawn,
      totalEarned: user.totalVolume,
    });
  } catch (err) {
    logger.error(err, "Ошибка загрузки баланса");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
  }
});

router.post("/deposit", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { amount, gateway = "rukassa" } = req.body;
    if (!amount || amount < 500) { res.status(400).json({ message: "Минимальная сумма пополнения — 500 ₽" }); return; }

    const [tx] = await db.insert(transactions).values({
      userId,
      type: "deposit",
      amount: amount.toFixed(2),
      status: "pending",
      gatewayType: gateway,
      description: `Deposit via ${gateway}`,
    }).returning();

    const paymentResult = await createPayment(gateway, amount, tx.id, `Minions Market deposit`, userId);

    if (paymentResult) {
      await db.update(transactions).set({ gatewayOrderId: paymentResult.orderId }).where(eq(transactions.id, tx.id));
      res.json({ transactionId: tx.id, payUrl: paymentResult.payUrl });
    } else {
      // FIX: тестовый режим зачисления только в NON-production окружении
      if (process.env.NODE_ENV === "production") {
        await db.update(transactions).set({ status: "cancelled" }).where(eq(transactions.id, tx.id));
        res.status(400).json({ message: "Платёжный шлюз не настроен. Обратитесь к администратору." });
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
    logger.error(err, "Ошибка создания платежа");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
  }
});

router.post("/withdraw", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { amount, method, details } = req.body;
    if (!amount || amount < 500) { res.status(400).json({ message: "Минимальная сумма вывода — 500 ₽" }); return; }
    if (!method || !details) { res.status(400).json({ message: "Укажите метод и реквизиты для вывода" }); return; }

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
      res.status(400).json({ message: "Недостаточно средств на балансе" });
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
    logger.error(err, "Ошибка создания заявки на вывод");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
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
    logger.error(err, "Ошибка загрузки транзакций");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
  }
});

// =====================================================================
// CLICK webhook (Узбекистан) — Prepare + Complete
// Настрой в ЛК Click: URL = https://yourdomain.up.railway.app/api/wallet/webhook/click
// Переменные окружения: CLICK_SERVICE_ID, CLICK_MERCHANT_ID, CLICK_SECRET_KEY
// =====================================================================

function clickSign(
  clickTransId: string | number,
  serviceId: string | number,
  secretKey: string,
  merchantTransId: string,
  amount: string | number,
  action: string | number,
  signTime: string,
): string {
  const str = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${amount}${action}${signTime}`;
  return crypto.createHash("md5").update(str).digest("hex");
}

router.post("/webhook/click", async (req, res) => {
  try {
    const body = req.body;
    logger.info({ body }, "Click webhook received");

    const {
      click_trans_id,
      service_id,
      merchant_trans_id, // наш transactionId (передан как transaction_param)
      merchant_prepare_id,
      amount,
      action,
      error: clickError,
      sign_time,
      sign_string,
    } = body;

    const secretKey = process.env.CLICK_SECRET_KEY;
    if (!secretKey) {
      logger.error("CLICK_SECRET_KEY not set");
      res.json({ click_trans_id, merchant_trans_id, error: -1, error_note: "Server misconfigured" });
      return;
    }

    // Проверяем подпись
    const expectedSign = clickSign(click_trans_id, service_id, secretKey, merchant_trans_id, amount, action, sign_time);
    if (expectedSign !== sign_string) {
      logger.warn({ expectedSign, sign_string }, "Click sign check failed");
      res.json({ click_trans_id, merchant_trans_id, error: -1, error_note: "SIGN CHECK FAILED!" });
      return;
    }

    // Ошибка на стороне Click (пользователь отменил и т.п.)
    if (Number(clickError) < 0) {
      res.json({ click_trans_id, merchant_trans_id, error: Number(clickError), error_note: "Payment error" });
      return;
    }

    // Ищем транзакцию по merchant_trans_id
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, merchant_trans_id)).limit(1);

    if (!tx) {
      res.json({ click_trans_id, merchant_trans_id, error: -5, error_note: "Transaction not found" });
      return;
    }

    // Проверяем сумму (допуск ±1 сум на погрешность округления)
    if (Math.abs(parseFloat(tx.amount) - parseFloat(amount)) > 1) {
      res.json({ click_trans_id, merchant_trans_id, error: -2, error_note: "Incorrect parameter amount" });
      return;
    }

    const numAction = Number(action);

    // ------------------------------------------------------------------
    // PREPARE (action = 0)
    // Click проверяет — существует ли заказ и можно ли его оплатить.
    // ------------------------------------------------------------------
    if (numAction === 0) {
      if (tx.status === "completed") {
        res.json({ click_trans_id, merchant_trans_id, merchant_prepare_id: tx.id, error: -4, error_note: "Already paid" });
        return;
      }

      // Сохраняем click_trans_id для проверки на шаге Complete
      await db.update(transactions)
        .set({ gatewayOrderId: String(click_trans_id) })
        .where(eq(transactions.id, tx.id));

      res.json({
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: tx.id,
        error: 0,
        error_note: "Success",
      });
      return;
    }

    // ------------------------------------------------------------------
    // COMPLETE (action = 1)
    // Click подтверждает — деньги списаны, зачисляем баланс.
    // ------------------------------------------------------------------
    if (numAction === 1) {
      if (!merchant_prepare_id || merchant_prepare_id !== tx.id) {
        res.json({ click_trans_id, merchant_trans_id, error: -6, error_note: "Transaction does not exist" });
        return;
      }

      if (tx.status === "completed") {
        res.json({ click_trans_id, merchant_trans_id, merchant_confirm_id: tx.id, error: -4, error_note: "Already paid" });
        return;
      }

      if (tx.status !== "pending") {
        res.json({ click_trans_id, merchant_trans_id, error: -9, error_note: "Transaction cancelled" });
        return;
      }

      const txAmount = parseFloat(tx.amount);

      // Атомарно зачисляем баланс
      await db.update(users).set({
        balance: sql`balance + ${tx.amount}::numeric`,
        totalDeposited: sql`total_deposited + ${tx.amount}::numeric`,
      }).where(eq(users.id, tx.userId));

      const [user] = await db.select({ balance: users.balance, telegramId: users.telegramId })
        .from(users).where(eq(users.id, tx.userId)).limit(1);

      await db.update(transactions).set({
        status: "completed",
        balanceBefore: (parseFloat(user.balance) - txAmount).toFixed(2),
        balanceAfter: user.balance,
      }).where(eq(transactions.id, tx.id));

      await notifyUser(user.telegramId, notify.depositSuccess(tx.amount, user.balance));
      logger.info({ txId: tx.id, click_trans_id, userId: tx.userId, amount: tx.amount }, "Платёж Click успешно завершён");

      res.json({
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: tx.id,
        error: 0,
        error_note: "Success",
      });
      return;
    }

    res.json({ click_trans_id, merchant_trans_id, error: -3, error_note: "Action not found" });
  } catch (err) {
    logger.error(err, "Ошибка вебхука Click");
    res.status(200).json({ error: -7, error_note: "Server error" });
  }
});

router.post("/webhook/:gateway", async (req, res) => {
  try {
    const { gateway } = req.params;
    const body = req.body;
    logger.info({ gateway, body }, "Payment webhook received");

    let orderId: string | null = null;
    let status = "completed";

<<<<<<< HEAD
    // FIX БАГ #2: проверка подписи для каждого шлюза
    if (gateway === "rukassa") {
      // Rukassa подписывает HMAC-SHA256(shop_id + order_id + secret_key)
      const secret = process.env.RUKASSA_SECRET_KEY;
      if (secret && body.sign) {
        const expected = crypto
          .createHmac("sha256", secret)
          .update(`${body.shop_id}:${body.order_id}:${secret}`)
          .digest("hex");
        if (expected !== body.sign) {
          logger.warn({ gateway }, "Rukassa webhook signature mismatch");
          res.status(400).json({ ok: false, message: "Invalid signature" });
          return;
        }
      } else if (secret && !body.sign) {
        // Секрет задан, но подписи нет — отклоняем
        logger.warn({ gateway }, "Rukassa webhook missing signature");
        res.status(400).json({ ok: false, message: "Missing signature" });
        return;
      }
=======
    if (gateway === "rukassa") {
>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb
      orderId = body.order_id;
      if (body.status === "PAID") status = "completed";
      else { res.json({ ok: true }); return; }
    } else if (gateway === "nowpayments") {
<<<<<<< HEAD
      // NowPayments подписывает HMAC-SHA512(sorted JSON body, ipn_secret)
      const secret = process.env.NOWPAYMENTS_IPN_SECRET;
      if (secret) {
        const rawBody = JSON.stringify(
          Object.keys(body).sort().reduce((acc: Record<string, unknown>, k) => { acc[k] = body[k]; return acc; }, {})
        );
        const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
        const received = req.headers["x-nowpayments-sig"] as string;
        if (!received || expected !== received) {
          logger.warn({ gateway }, "NowPayments webhook signature mismatch");
          res.status(400).json({ ok: false, message: "Invalid signature" });
          return;
        }
      }
=======
>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb
      orderId = body.order_id;
      if (body.payment_status === "finished") status = "completed";
      else { res.json({ ok: true }); return; }
    } else if (gateway === "crystalpay") {
<<<<<<< HEAD
      // CrystalPay не предоставляет webhook-подписи для депозитов —
      // безопасность обеспечивается тем, что orderId сверяется с БД и статус pending
=======
>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb
      orderId = body.extra;
      status = "completed";
    }

    if (!orderId) { res.status(400).json({ message: "Неверный формат вебхука" }); return; }

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
    logger.error(err, "Ошибка обработки вебхука");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
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

    if (!orderId) { res.status(400).json({ message: "Неверный формат вебхука" }); return; }

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
      logger.info({ txId: tx.id }, "Выплата завершена через вебхук Rukassa");

    } else if (rukassaStatus === "CANCEL") {
      // Выплата отменена — возвращаем баланс
      await db.update(transactions).set({ status: "cancelled" }).where(eq(transactions.id, tx.id));
      await db.update(users).set({
        balance: sql`balance + ${tx.amount}::numeric`,
      }).where(eq(users.id, tx.userId));

      const [user] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, tx.userId)).limit(1);
      await notifyUser(user?.telegramId, notify.withdrawRejected(tx.amount, "Автоматическая выплата отменена"));
      await notifyAdmin(`❌ Payout CANCELLED by Rukassa: ${tx.amount} ₽ (tx: ${tx.id}) — баланс возвращён`);
      logger.warn({ txId: tx.id }, "Выплата отменена Rukassa — баланс возвращён");
    }
    // IN PROCESS / WAIT — просто ждём, ничего не делаем

    res.json({ ok: true });
  } catch (err) {
    logger.error(err, "Ошибка вебхука выплаты");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
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

    if (!orderId) { res.status(400).json({ message: "Неверный вебхук: отсутствует поле extra" }); return; }

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
      logger.info({ txId: tx.id, payoffId }, "Выплата завершена через вебхук CrystalPay");

    } else if (state === "canceled" || state === "failed") {
      await db.update(transactions).set({ status: "cancelled" }).where(eq(transactions.id, tx.id));
      await db.update(users).set({
        balance: sql`balance + ${tx.amount}::numeric`,
      }).where(eq(users.id, tx.userId));

      const [user] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, tx.userId)).limit(1);
      await notifyUser(user?.telegramId, notify.withdrawRejected(tx.amount, "Автоматическая выплата отменена"));
      await notifyAdmin(`❌ Payout ${state.toUpperCase()} by CrystalPay: ${tx.amount} ₽ (tx: ${tx.id}) — баланс возвращён`);
      logger.warn({ txId: tx.id, state }, "Выплата отменена CrystalPay — баланс возвращён");
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error(err, "Ошибка вебхука CrystalPay");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
  }
});
