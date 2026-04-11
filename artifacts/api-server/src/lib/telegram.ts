import { logger } from "./logger";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, skipping message");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    return res.ok;
  } catch (err) {
    logger.error(err, "Failed to send Telegram message");
    return false;
  }
}

export function verifyTelegramWebAppData(initData: string): { user?: any; valid: boolean } {
  if (!BOT_TOKEN) return { valid: false };
  try {
    const crypto = require("crypto");
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (computedHash !== hash) return { valid: false };
    const userStr = params.get("user");
    const user = userStr ? JSON.parse(userStr) : null;
    return { user, valid: true };
  } catch {
    return { valid: false };
  }
}

export async function notifyAdmin(text: string) {
  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (adminChatId) {
    await sendTelegramMessage(adminChatId, `🔔 <b>Admin notification</b>\n${text}`);
  }
}

/**
 * Отправить уведомление конкретному пользователю по его telegramId
 * telegramId берётся из поля users.telegram_id в БД
 */
export async function notifyUser(telegramId: string | null | undefined, text: string): Promise<void> {
  if (!telegramId) return;
  await sendTelegramMessage(telegramId, text);
}

// ─── Шаблоны уведомлений ────────────────────────────────────────────────────

export const notify = {
  /** Покупатель создал сделку */
  dealCreatedBuyer: (dealNumber: number, productTitle: string, amount: string) =>
    `🛒 <b>Сделка #${dealNumber} создана</b>\n\n` +
    `Товар: <b>${productTitle}</b>\n` +
    `Сумма: <b>${amount} ₽</b>\n\n` +
    `Ожидайте передачи товара от продавца.`,

  /** Продавец — новый заказ */
  dealCreatedSeller: (dealNumber: number, productTitle: string, amount: string, buyerUsername: string) =>
    `📦 <b>Новый заказ #${dealNumber}!</b>\n\n` +
    `Товар: <b>${productTitle}</b>\n` +
    `Покупатель: @${buyerUsername}\n` +
    `Сумма: <b>${amount} ₽</b>\n\n` +
    `Передайте товар покупателю как можно скорее.`,

  /** Продавец передал товар */
  dealDeliveredBuyer: (dealNumber: number, productTitle: string) =>
    `📬 <b>Товар по сделке #${dealNumber} передан!</b>\n\n` +
    `<b>${productTitle}</b>\n\n` +
    `Проверьте товар и подтвердите получение, либо откройте спор.`,

  /** Покупатель подтвердил — сделка завершена */
  dealCompletedSeller: (dealNumber: number, productTitle: string, sellerAmount: string) =>
    `✅ <b>Сделка #${dealNumber} завершена!</b>\n\n` +
    `Товар: <b>${productTitle}</b>\n` +
    `Зачислено: <b>+${sellerAmount} ₽</b>`,

  dealCompletedBuyer: (dealNumber: number, productTitle: string) =>
    `✅ <b>Сделка #${dealNumber} завершена</b>\n\n` +
    `Спасибо за покупку <b>${productTitle}</b>!\n` +
    `Не забудьте оставить отзыв.`,

  /** Открыт спор */
  dealDisputedSeller: (dealNumber: number, reason: string) =>
    `⚠️ <b>Открыт спор по сделке #${dealNumber}</b>\n\n` +
    `Причина: ${reason}\n\n` +
    `Администратор рассмотрит ситуацию.`,

  dealDisputedBuyer: (dealNumber: number) =>
    `⚠️ <b>Спор по сделке #${dealNumber} открыт</b>\n\n` +
    `Администратор свяжется с вами.`,

  /** Пополнение баланса */
  depositSuccess: (amount: string, newBalance: string) =>
    `💰 <b>Баланс пополнен</b>\n\n` +
    `Зачислено: <b>+${amount} ₽</b>\n` +
    `Текущий баланс: <b>${newBalance} ₽</b>`,

  /** Заявка на вывод */
  withdrawCreated: (amount: string, method: string) =>
    `💳 <b>Заявка на вывод принята</b>\n\n` +
    `Сумма: <b>${amount} ₽</b>\n` +
    `Метод: ${method}\n\n` +
    `Обычно обрабатывается в течение 24 часов.`,

  /** Вывод одобрен/отклонён */
  withdrawApproved: (amount: string) =>
    `✅ <b>Вывод одобрен</b>\n\n` +
    `<b>${amount} ₽</b> отправлены на ваши реквизиты.`,

  withdrawRejected: (amount: string, reason?: string) =>
    `❌ <b>Вывод отклонён</b>\n\n` +
    `Сумма: <b>${amount} ₽</b> возвращена на баланс.` +
    (reason ? `\nПричина: ${reason}` : ""),

  /** Товар прошёл модерацию */
  productApproved: (productTitle: string) =>
    `✅ <b>Ваш товар одобрен!</b>\n\n` +
    `<b>${productTitle}</b> теперь виден всем покупателям.`,

  productRejected: (productTitle: string, reason?: string) =>
    `❌ <b>Товар отклонён модератором</b>\n\n` +
    `<b>${productTitle}</b>\n` +
    (reason ? `Причина: ${reason}` : "Товар не соответствует правилам площадки."),
};
