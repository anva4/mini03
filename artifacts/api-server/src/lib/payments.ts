import { logger } from "./logger";

interface PaymentResult {
  orderId: string;
  payUrl: string;
}

export interface PayoutResult {
  payoutId: string;
  status: string; // WAIT | IN PROCESS | PAID | CANCEL
}

// Маппинг методов вывода на методы Rukassa (way)
// Актуальные значения: CARD, SBP, QIWI, YOOMONEY
const RUKASSA_PAYOUT_METHODS: Record<string, string> = {
  card: "CARD",
  sbp:  "SBP",
  qiwi: "QIWI",
};

/**
 * Создаёт автоматическую выплату через Rukassa createWithdraw API.
 * Docs: https://lk.rukassa.pro/api/v1 → createWithdraw
 * @param amount   Сумма в рублях
 * @param orderId  ID транзакции в нашей БД (для логов)
 * @param method   card | sbp | qiwi
 * @param details  Номер карты / телефон для СБП / кошелёк
 */
export async function createRukassaPayout(
  amount: number,
  orderId: string,
  method: string,
  details: string,
): Promise<PayoutResult | null> {
  const email    = process.env.RUKASSA_EMAIL;
  const password = process.env.RUKASSA_PASSWORD;
  if (!email || !password) {
    logger.warn("Rukassa payout not configured — need RUKASSA_EMAIL and RUKASSA_PASSWORD");
    return null;
  }
  const rukassaMethod = RUKASSA_PAYOUT_METHODS[method];
  if (!rukassaMethod) {
    logger.warn({ method }, "Rukassa payout: unsupported method");
    return null;
  }
  try {
    const res = await fetch("https://lk.rukassa.pro/api/v1/createWithdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        way:    rukassaMethod,
        wallet: details,
        amount: amount.toString(),
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    logger.info({ data, orderId }, "Rukassa payout response");
    if (data.id) {
      return { payoutId: String(data.id), status: String(data.status ?? "WAIT") };
    }
    logger.error(data, "Rukassa payout error");
    return null;
  } catch (err) {
    logger.error(err, "Rukassa payout request failed");
    return null;
  }
}

// Маппинг методов вывода на методы CrystalPay
const CRYSTALPAY_PAYOUT_METHODS: Record<string, string> = {
  card:   "CARDRUBP2P",
  sbp:    "SBERSBP",
  qiwi:   "QIWI",
  crypto: "USDTTRC",
};

function crystalPaySignature(id: string, salt: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha1").update(`${id}:${salt}`).digest("hex");
}

/**
 * Создаёт и подтверждает автоматическую выплату через CrystalPay Payoff API.
 * Два шага: create → submit (обязательно оба).
 */
export async function createCrystalPayPayout(
  amount: number,
  orderId: string,
  method: string,
  details: string,
): Promise<PayoutResult | null> {
  const apiKey  = process.env.CRYSTALPAY_API_KEY;
  const shopName = process.env.CRYSTALPAY_SHOP_NAME;
  const salt    = process.env.CRYSTALPAY_SALT; // Отдельный Salt-ключ для подписи
  if (!apiKey || !shopName || !salt) {
    logger.warn("CrystalPay not configured for payouts (need CRYSTALPAY_SALT)");
    return null;
  }

  const crystalMethod = CRYSTALPAY_PAYOUT_METHODS[method];
  if (!crystalMethod) {
    logger.warn({ method }, "CrystalPay payout: unsupported method");
    return null;
  }

  try {
    // Шаг 1: Создать заявку на вывод
    const createRes = await fetch("https://api.crystalpay.io/v3/payoff/create/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_login:    shopName,
        auth_secret:   apiKey,
        method:        crystalMethod,
        wallet:        details,
        amount:        amount,
        amount_currency: "RUB",
        subtract_from: "balance",
        extra:         orderId,        // наш ID для сверки
        callback_url:  process.env.APP_URL
          ? `${process.env.APP_URL}/api/wallet/payout-webhook/crystalpay`
          : undefined,
        signature: crystalPaySignature(orderId, salt),
      }),
    });
    const createData = await createRes.json() as Record<string, unknown>;
    logger.info({ createData, orderId }, "CrystalPay payoff create response");

    if (createData.error || !createData.id) {
      logger.error(createData, "CrystalPay payout create error");
      return null;
    }

    const payoffId = String(createData.id);

    // Шаг 2: Подтвердить заявку
    const submitRes = await fetch("https://api.crystalpay.io/v3/payoff/submit/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_login:  shopName,
        auth_secret: apiKey,
        id:          payoffId,
        signature:   crystalPaySignature(payoffId, salt),
      }),
    });
    const submitData = await submitRes.json() as Record<string, unknown>;
    logger.info({ submitData, orderId }, "CrystalPay payoff submit response");

    if (submitData.error) {
      logger.error(submitData, "CrystalPay payout submit error");
      return null;
    }

    return { payoutId: payoffId, status: String(submitData.state ?? "processing") };
  } catch (err) {
    logger.error(err, "CrystalPay payout request failed");
    return null;
  }
}

export async function createRukassaPayment(amount: number, orderId: string, description: string): Promise<PaymentResult | null> {
  const apiKey = process.env.RUKASSA_API_KEY;
  const shopId = process.env.RUKASSA_SHOP_ID;
  if (!apiKey || !shopId) {
    logger.warn("Rukassa not configured");
    return null;
  }
  try {
    const res = await fetch("https://lk.rukassa.pro/api/v1/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_id: Number(shopId),
        token: apiKey,
        order_id: orderId,
        amount: amount.toString(),
        description,
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    if (typeof data.url === "string") return { orderId, payUrl: data.url };
    logger.error(data, "Rukassa error");
    return null;
  } catch (err) {
    logger.error(err, "Rukassa request failed");
    return null;
  }
}

export async function createNowPayment(amount: number, orderId: string, description: string): Promise<PaymentResult | null> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    logger.warn("NOWPayments not configured");
    return null;
  }
  try {
    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: "rub",
        order_id: orderId,
        order_description: description,
        success_url: process.env.APP_URL || "",
        cancel_url: process.env.APP_URL || "",
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    if (typeof data.invoice_url === "string") return { orderId, payUrl: data.invoice_url };
    return null;
  } catch (err) {
    logger.error(err, "NOWPayments request failed");
    return null;
  }
}

export async function createCrystalPayPayment(amount: number, orderId: string, description: string): Promise<PaymentResult | null> {
  const apiKey = process.env.CRYSTALPAY_API_KEY;
  const shopName = process.env.CRYSTALPAY_SHOP_NAME;
  if (!apiKey || !shopName) {
    logger.warn("CrystalPay not configured");
    return null;
  }
  try {
    const res = await fetch("https://api.crystalpay.io/v2/invoice/create/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_login: shopName,
        auth_secret: apiKey,
        amount,
        type: "purchase",
        description,
        extra: orderId,
        lifetime: 3600,
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    if (typeof data.url === "string") return { orderId, payUrl: data.url };
    return null;
  } catch (err) {
    logger.error(err, "CrystalPay request failed");
    return null;
  }
}

// =====================================================================
// CLICK (Узбекистан)
// Переменные окружения:
//   CLICK_SERVICE_ID   — ID сервиса из ЛК Click
//   CLICK_MERCHANT_ID  — ID мерчанта из ЛК Click
//   CLICK_SECRET_KEY   — Secret Key для подписи вебхуков
// =====================================================================

/**
 * Генерирует URL для оплаты через Click.
 * Пользователь редиректится на страницу оплаты Click.
 * После оплаты Click шлёт Prepare + Complete на /api/wallet/webhook/click
 *
 * @param amount   Сумма в UZS (узбекских сумах)
 * @param orderId  ID транзакции в нашей БД
 */
export async function createClickPayment(amount: number, orderId: string): Promise<PaymentResult | null> {
  const serviceId  = process.env.CLICK_SERVICE_ID;
  const merchantId = process.env.CLICK_MERCHANT_ID;
  if (!serviceId || !merchantId) {
    logger.warn("Click not configured — need CLICK_SERVICE_ID and CLICK_MERCHANT_ID");
    return null;
  }
  const returnUrl = encodeURIComponent(`${process.env.APP_URL || ""}/payment/success`);
  const payUrl = `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${amount}&transaction_param=${orderId}&return_url=${returnUrl}`;
  return { orderId, payUrl };
}

export async function createPayment(gateway: string, amount: number, orderId: string, description: string): Promise<PaymentResult | null> {
  switch (gateway) {
    case "rukassa":     return createRukassaPayment(amount, orderId, description);
    case "nowpayments": return createNowPayment(amount, orderId, description);
    case "crystalpay":  return createCrystalPayPayment(amount, orderId, description);
    case "click":       return createClickPayment(amount, orderId);
    default:            return null;
  }
}
