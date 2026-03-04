/**
 * auth.js
 * ───────
 * One-time script: opens a browser for Google login, captures the
 * refresh token, and appends it to .env.
 *
 * Usage:  node auth.js
 */

require("dotenv").config();

const http = require("http");
const { URL } = require("url");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = "http://localhost:3000/oauth/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌  Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.");
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

// Spin up a tiny server to catch the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:3000");

  if (url.pathname !== "/oauth/callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400);
    res.end("Missing code parameter");
    return;
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>⚠️ No refresh token received</h1><p>Try revoking app access at <a href='https://myaccount.google.com/permissions'>myaccount.google.com/permissions</a> and run this again.</p>");
      server.close();
      return;
    }

    // Append / update refresh token in .env
    const envPath = path.join(__dirname, ".env");
    let envContent = fs.readFileSync(envPath, "utf-8");

    if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
      envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${refreshToken}`);
    } else {
      envContent += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`;
    }

    fs.writeFileSync(envPath, envContent);

    console.log("\n✅  Refresh token saved to .env!");
    console.log("   Token:", refreshToken.slice(0, 20) + "…");
    console.log("\n🚀  You can now start the server with: npm start\n");

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html><body style="font-family:system-ui;text-align:center;padding:3rem;background:#0f0f1a;color:#e0e0f0">
        <h1 style="color:#22c55e">✅ Authorization Successful!</h1>
        <p>Refresh token has been saved to <code>.env</code></p>
        <p>You can close this tab and go back to your terminal.</p>
      </body></html>
    `);
  } catch (err) {
    console.error("❌  Token exchange failed:", err.message);
    res.writeHead(500);
    res.end("Token exchange failed: " + err.message);
  }

  server.close();
});

server.listen(3000, () => {
  console.log("\n🔐  Google OAuth Authorization");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nOpening browser for Google login...\n");
  console.log("If it doesn't open, visit this URL manually:\n");
  console.log(authUrl);
  console.log("");

  // Open browser
  const { exec } = require("child_process");
  exec(`open "${authUrl}"`);
});
