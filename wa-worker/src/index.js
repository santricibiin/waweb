require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const express = require("express");
const path = require("path");
const fs = require("fs");
const pino = require("pino");

const { sessionManager } = require("./session-manager");

const PORT = parseInt(process.env.WORKER_PORT || "4000", 10);
const TOKEN = process.env.WORKER_INTERNAL_TOKEN || "";
const AUTH_DIR = path.resolve(
  __dirname,
  "..",
  process.env.WA_AUTH_DIR || "./auth-sessions"
);

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

const logger = pino({ level: "info" });
sessionManager.init({ authDir: AUTH_DIR, logger });

const app = express();
app.use(express.json({ limit: "1mb" }));

// Internal token guard
app.use((req, res, next) => {
  const t = req.header("x-internal-token");
  if (!TOKEN || t !== TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, sessions: sessionManager.list() });
});

app.post("/sessions/:id/start", async (req, res) => {
  try {
    await sessionManager.start(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "start session failed");
    res.status(500).json({ error: err.message });
  }
});

app.get("/sessions/:id/status", async (req, res) => {
  const status = await sessionManager.status(req.params.id);
  res.json(status);
});

app.post("/sessions/:id/logout", async (req, res) => {
  try {
    await sessionManager.logout(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "logout failed");
    res.status(500).json({ error: err.message });
  }
});

app.post("/sessions/:id/send", async (req, res) => {
  try {
    const { phone, text } = req.body || {};
    if (!phone || !text) {
      return res.status(400).json({ error: "phone and text are required" });
    }
    const result = await sessionManager.sendMessage(req.params.id, phone, text);
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "send message failed");
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`WhatsApp worker listening on http://localhost:${PORT}`);
});
