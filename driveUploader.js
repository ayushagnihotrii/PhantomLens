/**
 * driveUploader.js
 * ----------------
 * Helper: uploads a file buffer to Google Drive using a service account.
 */

const { google } = require("googleapis");
const { Readable } = require("stream");
const path = require("path");
const fs = require("fs");

let driveClient = null;

/**
 * Initialise the Drive client once (lazy singleton).
 */
function getDriveClient() {
  if (driveClient) return driveClient;

  const keyPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "./credentials.json");

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Google service-account key not found at "${keyPath}".\n` +
        "Download one from the GCP console and place it at the path set in .env"
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

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

module.exports = { uploadToDrive };
