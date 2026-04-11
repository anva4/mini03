/**
 * rate-limit.ts
 *
 * Централизованный in-memory rate limiter.
 * Ключ = IP + userId (если авторизован) + маршрут.
 *
 * Для production с несколькими репликами — заменить store на Redis:
 *   npm i @upstash/ratelimit @upstash/redis
 *
 * Использование:
 *   router.post("/", rateLimit({ max: 5, windowMs: 60_000 }), handler)
 *   router.post("/", rateLimit({ max: 30, windowMs: 60_000, keyFn: ipOnly }), handler)
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

interface RateLimitOptions {
  /** Максимальное количество запросов в окне */
  max: number;
  /** Длина окна в миллисекундах */
  windowMs: number;
  /** Функция генерации ключа (по умолчанию: IP + userId) */
  keyFn?: (req: Request) => string;
  /** Сообщение при превышении лимита */
  message?: string;
}

// Единый store для всех лимитеров
const store = new Map<string, { count: number; resetAt: number }>();

// Очистка устаревших записей каждые 5 минут (предотвращает утечку памяти)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) logger.debug({ cleaned }, "Rate limiter store cleaned");
}, 5 * 60 * 1000);

export function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

/** Ключ: только IP (для публичных эндпоинтов) */
export function ipOnly(req: Request): string {
  return `ip:${getClientIp(req)}`;
}

/** Ключ: IP + userId (для авторизованных эндпоинтов, устойчивее к VPN-смене) */
export function ipAndUser(req: Request): string {
  const ip = getClientIp(req);
  const userId = (req as any).userId || "anon";
  return `ip:${ip}:user:${userId}`;
}

export function rateLimit(opts: RateLimitOptions) {
  const {
    max,
    windowMs,
    keyFn = ipAndUser,
    message = "Слишком много запросов. Попробуйте позже.",
  } = opts;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `rl:${req.path}:${keyFn(req)}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.status(429).json({ message });
      return;
    }

    next();
  };
}

// Пресеты для типичных случаев
export const limits = {
  /** Отправка сообщений: 30 в минуту на пользователя */
  messages: rateLimit({
    max: 30,
    windowMs: 60_000,
    keyFn: ipAndUser,
    message: "Вы отправляете сообщения слишком часто. Подождите минуту.",
  }),

  /** Создание объявлений: 10 в час на пользователя */
  createProduct: rateLimit({
    max: 10,
    windowMs: 60 * 60_000,
    keyFn: ipAndUser,
    message: "Слишком много объявлений за короткое время. Попробуйте через час.",
  }),

  /** Создание сделок: 20 в минуту на пользователя (защита от скриптов) */
  createDeal: rateLimit({
    max: 20,
    windowMs: 60_000,
    keyFn: ipAndUser,
    message: "Слишком много попыток покупки. Подождите минуту.",
  }),

  /** Запрос кода авторизации: 3 в 10 минут по IP */
  requestAuthCode: rateLimit({
    max: 3,
    windowMs: 10 * 60_000,
    keyFn: ipOnly,
    message: "Слишком много запросов кода. Подождите 10 минут.",
  }),

  /** Webhook'и от платёжных систем: без лимита (у них фиксированные IP) */
  webhook: rateLimit({ max: 1000, windowMs: 60_000, keyFn: ipOnly }),
};
