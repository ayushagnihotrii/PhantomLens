/**
 * driveUploader.js
 * ────────────────
 * Uploads files to Google Drive using OAuth 2.0 (personal account).
 *
 * Flow:
 *   1. Run `node auth.js` once → logs in via browser → saves refresh token
 *   2. This module uses the refresh token to get access tokens automatically
 */

const { google } = require("googleapis");
const { Readable } = require("stream");

let driveClient = null;

/**
 * Build an OAuth2 client from env vars.
 */
function getOAuth2Client() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (refreshToken) {
    oauth2.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2;
}

/**
 * Get an authenticated Drive client (lazy singleton).
 */
function getDriveClient() {
  if (driveClient) return driveClient;
  const auth = getOAuth2Client();
  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

/**
 * Upload a buffer to Google Drive.
 *
 * @param {Buffer}  buffer   – image bytes
 * @param {string}  fileName – desired filename on Drive
 * @param {string}  mimeType – e.g. "image/png"
 * @returns {Promise<{fileId: string, webViewLink: string}>}
 */
async function uploadToDrive(buffer, fileName, mimeType) {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const fileMetadata = {
    name: fileName,
    ...(folderId && { parents: [folderId] }),
  };

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink",
  });

  return {
    fileId: res.data.id,
    webViewLink: res.data.webViewLink || "",
  };
}

module.exports = { uploadToDrive, getOAuth2Client };
