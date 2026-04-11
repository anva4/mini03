import { Router } from "express";
import { db } from "@workspace/db";
import { users, authCodes } from "@workspace/db/schema";
<<<<<<< HEAD
import { eq, and, gt, isNull, sql } from "drizzle-orm";
=======
import { eq, and, gt, isNull } from "drizzle-orm";
>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb
import { hashPassword, comparePassword, signToken } from "../lib/auth";
import { verifyTelegramWebAppData, sendTelegramMessage } from "../lib/telegram";
import { logger } from "../lib/logger";

const router = Router();

const SUPER_ADMIN_TG_ID = process.env.SUPER_ADMIN_TELEGRAM_ID || null;

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// FIX: простой in-memory rate limiter для /login
// Для production рекомендуется express-rate-limit + Redis
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 минут

function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (entry.count >= LOGIN_MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function resetLoginRateLimit(key: string): void {
  loginAttempts.delete(key);
}

router.post("/register", async (req, res) => {
  try {
<<<<<<< HEAD
    const { username, password, code, telegramUsername, refCode: inputRefCode } = req.body;
=======
    const { username, password, code, telegramUsername } = req.body;
>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb
    if (!username || !password || !code) {
      res.status(400).json({ message: "Не заполнены обязательные поля" });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ message: "Это имя пользователя уже занято" });
      return;
    }

    const cleanTgUser = (telegramUsername || "").replace("@", "").toLowerCase();
    const validCode = await db.select().from(authCodes)
      .where(and(
        eq(authCodes.code, code.toUpperCase()),
        eq(authCodes.telegramUsername, cleanTgUser),
        gt(authCodes.expiresAt, Math.floor(Date.now() / 1000)),
        isNull(authCodes.usedAt)
      ))
      .limit(1);

    if (validCode.length === 0) {
      res.status(400).json({ message: "Неверный или просроченный код" });
      return;
    }

    await db.update(authCodes).set({ usedAt: Math.floor(Date.now() / 1000) }).where(eq(authCodes.id, validCode[0].id));

<<<<<<< HEAD
    // Проверяем реферальный код пригласившего
    let referrer: typeof users.$inferSelect | null = null;
    if (inputRefCode) {
      const [found] = await db.select().from(users)
        .where(eq(users.refCode, String(inputRefCode).toUpperCase()))
        .limit(1);
      referrer = found ?? null;
    }

    const hashed = await hashPassword(password);
    const newRefCode = Math.random().toString(36).substring(2, 10).toUpperCase();
=======
    const hashed = await hashPassword(password);
    const refCode = Math.random().toString(36).substring(2, 10).toUpperCase();
>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb

    const [user] = await db.insert(users).values({
      username,
      password: hashed,
      telegramUsername: cleanTgUser,
      telegramId: validCode[0].telegramId || undefined,
<<<<<<< HEAD
      refCode: newRefCode,
      refBy: referrer?.id ?? undefined,
    }).returning();

    // Начисляем реферальное вознаграждение пригласившему
    // 50 ₽ за каждого приглашённого (константа, вынести в env/config при желании)
    const REF_BONUS = parseFloat(process.env.REF_BONUS_AMOUNT || "50");
    if (referrer) {
      await db.update(users).set({
        refCount: sql`ref_count + 1`,
        refRewards: sql`ref_rewards + ${REF_BONUS.toFixed(2)}::numeric`,
        balance: sql`balance + ${REF_BONUS.toFixed(2)}::numeric`,
      }).where(eq(users.id, referrer.id));

      // Уведомляем пригласившего
      if (referrer.telegramId) {
        await sendTelegramMessage(
          referrer.telegramId,
          `🎉 По вашей реферальной ссылке зарегистрировался новый пользователь <b>${username}</b>!\n\nВам начислено <b>${REF_BONUS} ₽</b> на баланс.`,
        ).catch(() => {});
      }

      logger.info({ referrerId: referrer.id, newUserId: user.id, bonus: REF_BONUS }, "Referral bonus credited");
    }

=======
      refCode,
    }).returning();

>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb
    const token = signToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
    const { password: _, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    logger.error(err, "Ошибка регистрации");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: "Введите имя пользователя и пароль" });
      return;
    }

    // FIX: rate limit по username (защита от брутфорса)
    const rateLimitKey = `login:${username.toLowerCase()}`;
    if (!checkLoginRateLimit(rateLimitKey)) {
      res.status(429).json({ message: "Слишком много попыток входа. Попробуйте через 15 минут." });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user || !user.password) {
      res.status(401).json({ message: "Неверное имя пользователя или пароль" });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ message: "Ваш аккаунт заблокирован" });
      return;
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      res.status(401).json({ message: "Неверное имя пользователя или пароль" });
      return;
    }

    // FIX: сбрасываем счётчик попыток после успешного входа
    resetLoginRateLimit(rateLimitKey);

<<<<<<< HEAD
    // 2FA: если включена — отправляем код в Telegram вместо токена
    if (user.twoFAEnabled && user.telegramId) {
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 цифр
      const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 минут

      await db.update(users)
        .set({ twoFACode: code, twoFAExpires: expiresAt })
        .where(eq(users.id, user.id));

      await sendTelegramMessage(
        user.telegramId,
        `🔐 <b>Код подтверждения входа:</b>\n\n<code>${code}</code>\n\nДействителен 5 минут. Никому не сообщайте его.`,
      );

      res.json({ twoFARequired: true, userId: user.id });
      return;
    }

=======
>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb
    await db.update(users).set({ lastActive: Math.floor(Date.now() / 1000) }).where(eq(users.id, user.id));

    const token = signToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
    const { password: _, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    logger.error(err, "Ошибка входа");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
  }
});

<<<<<<< HEAD
// Второй шаг логина при включённой 2FA
// Frontend после получения { twoFARequired: true, userId } показывает форму ввода кода
// и отправляет POST /auth/2fa/confirm { userId, code }
router.post("/2fa/confirm", async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      res.status(400).json({ message: "Не переданы userId и код" });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      res.status(401).json({ message: "Пользователь не найден" });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      !user.twoFACode ||
      user.twoFACode !== String(code) ||
      !user.twoFAExpires ||
      user.twoFAExpires < now
    ) {
      res.status(401).json({ message: "Неверный или просроченный код" });
      return;
    }

    // Стираем одноразовый код
    await db.update(users)
      .set({ twoFACode: null, twoFAExpires: null, lastActive: now })
      .where(eq(users.id, user.id));

    const token = signToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
    const { password: _, ...safeUser } = user;

    res.json({ token, user: { ...safeUser, twoFACode: undefined, twoFAExpires: undefined } });
  } catch (err) {
    logger.error(err, "Ошибка подтверждения 2FA");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
  }
});

=======
>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb
router.post("/telegram", async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) {
      res.status(400).json({ message: "Отсутствуют данные Telegram" });
      return;
    }

    const { valid, user: tgUser } = verifyTelegramWebAppData(initData);
    if (!valid || !tgUser) {
      res.status(401).json({ message: "Неверные данные Telegram" });
      return;
    }

    const telegramId = String(tgUser.id);
    let [user] = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);

    if (!user) {
      const username = tgUser.username || `tg_${telegramId}`;
      const refCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      [user] = await db.insert(users).values({
        username,
        telegramId,
        telegramUsername: tgUser.username || "",
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        refCode,
      }).returning();
    } else {
      await db.update(users).set({ lastActive: Math.floor(Date.now() / 1000) }).where(eq(users.id, user.id));
    }

    const token = signToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
    const { password: _, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    logger.error(err, "Ошибка авторизации через Telegram");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
  }
});

router.post("/request-code", async (req, res) => {
  try {
    const { telegramUsername } = req.body;
    if (!telegramUsername) {
      res.status(400).json({ message: "Укажите имя пользователя Telegram" });
      return;
    }

    const cleanUsername = telegramUsername.replace("@", "").toLowerCase();

    const now = Math.floor(Date.now() / 1000);
    const recentCode = await db.select().from(authCodes)
      .where(and(
        eq(authCodes.telegramUsername, cleanUsername),
        gt(authCodes.expiresAt, now + 540),
        isNull(authCodes.usedAt)
      ))
      .limit(1);

    if (recentCode.length > 0) {
      res.status(429).json({ message: "Код уже отправлен. Подождите 60 секунд перед повторным запросом." });
      return;
    }

    const code = generateCode();
    const expiresAt = now + 600;

    await db.insert(authCodes).values({
      telegramUsername: cleanUsername,
      code,
      expiresAt,
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;

    const existingUser = await db.select({ telegramId: users.telegramId })
      .from(users)
      .where(eq(users.telegramUsername, cleanUsername))
      .limit(1);

    let messageSent = false;
    if (existingUser.length > 0 && existingUser[0].telegramId) {
      const minutesLeft = Math.ceil((expiresAt - now) / 60);
      messageSent = await sendTelegramMessage(
        existingUser[0].telegramId,
        `🔐 <b>Ваш код для входа на Minions Market:</b>\n\n<b>${code}</b>\n\nКод действует ${minutesLeft} мин. Никому не сообщайте его.`
      );
    }

    if (!messageSent && botUsername) {
      logger.info(`Auth code ${code} for @${cleanUsername}. User must write /start to @${botUsername}`);
    }

    res.json({
      message: "Code generated",
      botUsername: botUsername || null,
      directMessageSent: messageSent,
    });
  } catch (err) {
    logger.error(err, "Ошибка запроса кода");
    res.status(500).json({ message: "Внутренняя ошибка сервера. Попробуйте позже." });
  }
});

router.get("/me", async (req, res) => {
  const { authMiddleware } = await import("../lib/auth");
  authMiddleware(req, res, async () => {
    const [user] = await db.select().from(users).where(eq(users.id, (req as any).userId)).limit(1);
    if (!user) { res.status(404).json({ message: "Пользователь не найден" }); return; }
    const { password: _, ...safeUser } = user;
    // Авто-выдача isSuperAdmin по telegramId из env — без записи в БД
    const resolvedSuperAdmin = safeUser.isSuperAdmin || (SUPER_ADMIN_TG_ID ? safeUser.telegramId === SUPER_ADMIN_TG_ID : false);
    res.json({ ...safeUser, isSuperAdmin: resolvedSuperAdmin });
  });
});

export default router;
