const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const { Boom } = require("@hapi/boom");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

/**
 * Session manager: keeps a Baileys socket per sessionId.
 * Pushes status changes back to the Next.js app via internal callback.
 */

const sessions = new Map(); // sessionId -> { sock, status, qr, phoneNumber }
let cfg = { authDir: "", logger: console };

function setStatus(id, patch) {
  const cur = sessions.get(id) || {};
  const next = { ...cur, ...patch };
  sessions.set(id, next);
  notifyWeb(id, next).catch((err) => cfg.logger.warn({ err }, "notify web failed"));
}

async function notifyWeb(id, state) {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = process.env.WORKER_INTERNAL_TOKEN || "";
  if (!token) return;
  try {
    await fetch(`${url}/api/internal/session-status`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": token,
      },
      body: JSON.stringify({
        sessionId: id,
        status: state.status,
        phoneNumber: state.phoneNumber || null,
        qrIssuedAt: state.status === "QR" ? new Date().toISOString() : null,
      }),
    });
  } catch (err) {
    // Network errors are fine; web may be offline during dev
  }
}

function authPath(id) {
  return path.join(cfg.authDir, id);
}

async function startSession(id) {
  // If already connected/connecting, just return.
  const existing = sessions.get(id);
  if (existing?.sock && (existing.status === "CONNECTED" || existing.status === "CONNECTING")) {
    return;
  }

  const dir = authPath(id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: cfg.logger.child ? cfg.logger.child({ session: id }) : cfg.logger,
    browser: ["WA OTP Platform", "Chrome", "1.0"],
  });

  setStatus(id, { sock, status: "CONNECTING", qr: null, phoneNumber: null });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const dataUrl = await QRCode.toDataURL(qr);
        setStatus(id, { qr: dataUrl, status: "QR" });
      } catch (err) {
        setStatus(id, { qr, status: "QR" });
      }
    }

    if (connection === "open") {
      const me = sock.user?.id?.split(":")?.[0]?.split("@")?.[0] || null;
      setStatus(id, {
        status: "CONNECTED",
        qr: null,
        phoneNumber: me,
      });
    }

    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      cfg.logger.warn({ id, code }, "connection closed");
      if (loggedOut) {
        // Clear auth folder so next start asks for new QR
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch {}
        setStatus(id, { status: "LOGGED_OUT", sock: null, qr: null });
      } else {
        setStatus(id, { status: "DISCONNECTED", sock: null });
        // Auto reconnect after a short delay
        setTimeout(() => {
          startSession(id).catch((err) =>
            cfg.logger.error({ err }, "reconnect failed")
          );
        }, 2000);
      }
    }
  });
}

async function logoutSession(id) {
  const s = sessions.get(id);
  if (s?.sock) {
    try {
      await s.sock.logout();
    } catch {}
  }
  const dir = authPath(id);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
  sessions.delete(id);
  await notifyWeb(id, { status: "LOGGED_OUT" });
}

async function getStatus(id) {
  const s = sessions.get(id);
  return {
    sessionId: id,
    status: s?.status || "DISCONNECTED",
    qr: s?.qr || null,
    phoneNumber: s?.phoneNumber || null,
  };
}

function jidFor(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

async function sendMessage(id, phone, text) {
  const s = sessions.get(id);
  if (!s?.sock || s.status !== "CONNECTED") {
    throw new Error(`Session ${id} is not connected (status: ${s?.status || "DISCONNECTED"})`);
  }
  const jid = jidFor(phone);
  const sent = await s.sock.sendMessage(jid, { text });
  return { messageId: sent?.key?.id };
}

const sessionManager = {
  init({ authDir, logger }) {
    cfg.authDir = authDir;
    cfg.logger = logger || console;
  },
  start: startSession,
  logout: logoutSession,
  status: getStatus,
  sendMessage,
  list() {
    return Array.from(sessions.entries()).map(([id, s]) => ({
      id,
      status: s.status,
      phoneNumber: s.phoneNumber || null,
    }));
  },
};

module.exports = { sessionManager };
