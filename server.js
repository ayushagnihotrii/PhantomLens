/**
 * server.js
 * ---------
 * Express backend that:
 *   1. Serves the static frontend (public/)
 *   2. Receives front + rear camera photos via POST /api/upload
 *   3. Stores them locally  OR  uploads to Google Drive
 *   4. Logs device/timestamp metadata to captures.json
 */

require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const useragent = require("useragent");

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_MODE = (process.env.STORAGE_MODE || "local").toLowerCase();

// ── Ensure folders exist ────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const LOG_FILE = path.join(__dirname, "captures.json");
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "[]");

// ── Multer (memory storage so we can choose destination later) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are accepted"));
  },
});

// ── Serve frontend ──────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ── Health check ────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", storageMode: STORAGE_MODE });
});

// ── Upload endpoint ─────────────────────────────────────
app.post(
  "/api/upload",
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "rear", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const sessionId = uuidv4();
      const ts = new Date().toISOString();
      const agent = useragent.parse(req.headers["user-agent"]);

      const deviceInfo = {
        browser: agent.toAgent(),
        os: agent.os.toString(),
        device: agent.device.toString(),
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      };

      const saved = {};

      for (const field of ["front", "rear"]) {
        const file = req.files?.[field]?.[0];
        if (!file) continue;

        const ext = file.mimetype === "image/png" ? "png" : "jpg";
        const fileName = `${sessionId}_${field}_${Date.now()}.${ext}`;

        if (STORAGE_MODE === "drive") {
          const { uploadToDrive } = require("./driveUploader");
          const result = await uploadToDrive(file.buffer, fileName, file.mimetype);
          saved[field] = { storage: "drive", ...result, fileName };
        } else {
          // Local storage
          const dest = path.join(UPLOADS_DIR, fileName);
          fs.writeFileSync(dest, file.buffer);
          saved[field] = { storage: "local", path: dest, fileName };
        }
      }

      // ── Append to log ───────────────────────────────────
      const logEntry = { sessionId, timestamp: ts, deviceInfo, files: saved };
      const log = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
      log.push(logEntry);
      fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));

      console.log(`✅  Capture saved  [${sessionId}]  mode=${STORAGE_MODE}`);

      res.json({ success: true, sessionId, files: saved });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ── Dashboard endpoint – view all captures ──────────────
app.get("/api/captures", (_req, res) => {
  try {
    const log = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
    res.json(log);
  } catch {
    res.json([]);
  }
});

// ── Serve uploaded images (local mode only) ─────────────
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Start ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
🔒  Cam-Consent-Capture Server
   ├─ http://localhost:${PORT}
   ├─ Storage : ${STORAGE_MODE}
   └─ Uploads : ${UPLOADS_DIR}
  `);
});
