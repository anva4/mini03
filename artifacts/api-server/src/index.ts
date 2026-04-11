import app from "./app";
import { logger } from "./lib/logger";
import { seed } from "./seed";
import { pool } from "@workspace/db";
import { setupWebhook } from "./lib/bot";
import { startPayoutPoller } from "./lib/payout-poller";
import { startDealAutoCompleteJob } from "./lib/deal-autocomplete";

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- твой SQL без изменений
    `);

    await client.query(`
      -- твой ALTER без изменений
    `);

    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS deal_number_seq START 1001 INCREMENT 1;
    `);

    logger.info("Database migration completed");
  } finally {
    client.release();
  }
}

async function start() {
  await migrate();

  await new Promise<void>((resolve, reject) => {
    app.listen(port, "0.0.0.0", (err?: Error) => {
      if (err) { reject(err); return; }
      logger.info({ port }, "Server listening");
      resolve();
    });
  });

  seed().catch((err) => logger.error(err, "Seed failed"));
  setupWebhook().catch((err) => logger.error(err, "Webhook setup failed"));
  startPayoutPoller();
  startDealAutoCompleteJob();
}

start().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});
