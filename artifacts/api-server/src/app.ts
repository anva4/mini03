import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Security headers
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
<<<<<<< HEAD
  // HSTS: заставляем браузеры всегда использовать HTTPS (только в production)
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
=======
>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
<<<<<<< HEAD
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

if (allowedOrigins.length === 0 && process.env.NODE_ENV === "production") {
  // В production без ALLOWED_ORIGINS — разрешаем только одноимённый домен из APP_URL
  const appUrl = process.env.APP_URL;
  if (appUrl) allowedOrigins.push(appUrl);
  logger.warn("ALLOWED_ORIGINS not set — CORS restricted to APP_URL only. Set ALLOWED_ORIGINS for multiple domains.");
}

const corsOrigin = allowedOrigins.length === 0
  ? true  // dev: разрешаем всё
  : (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin '${origin}' not allowed`));
    };

app.use(cors({ origin: corsOrigin, credentials: true }));
=======
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["*"];

app.use(
  cors({
    origin: allowedOrigins[0] === "*" ? true : allowedOrigins,
    credentials: true,
  }),
);
>>>>>>> 689d826819b40d2220e4ee56731b3491f56230fb

// Увеличен лимит для base64 изображений (до 20mb)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Global IP-based rate limiter (in-memory, lightweight)
const ipHits = new Map<string, { count: number; resetAt: number }>();
const IP_RATE_LIMIT = 500;
const IP_RATE_WINDOW = 60 * 1000;

app.use((req, res, next) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + IP_RATE_WINDOW });
    return next();
  }
  entry.count++;
  if (entry.count > IP_RATE_LIMIT) {
    res.status(429).json({ message: "Too many requests" });
    return;
  }
  next();
});

// API routes
app.use("/api", router);

// Serve frontend static files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));

// SPA fallback
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
