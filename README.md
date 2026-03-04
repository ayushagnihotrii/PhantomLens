# 📸 Cam-Consent-Capture

> **University Cybersecurity Awareness Demo** – shows how a website can access
> device cameras **with explicit user consent**, capture photos, and store them
> server-side.

---

## 🗂 Project Structure

```
camzzz/
├── server.js            # Express backend (upload API, logging)
├── driveUploader.js     # Google Drive upload helper
├── package.json
├── .env                 # runtime config (copy from .env.example)
├── .env.example
├── captures.json        # auto-generated capture log
├── uploads/             # local photo storage (auto-created)
├── credentials.json     # (you provide) GCP service-account key
└── public/
    ├── index.html       # main consent + capture page
    ├── style.css
    ├── app.js           # frontend logic
    └── dashboard.html   # admin view of all captures
```

---

## 🚀 Quick Start (Local Storage)

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
open http://localhost:3000
```

Photos are saved to `./uploads/` and metadata is logged in `captures.json`.

Admin dashboard: **http://localhost:3000/dashboard.html**

---

## ☁️ Google Drive Storage (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable the **Google Drive API**
3. Create a **Service Account** → download the JSON key → save as `credentials.json` in the project root
4. Create a folder in Google Drive → share it with the service account email (with **Editor** access)
5. Copy the folder ID from the URL and update `.env`:

```env
STORAGE_MODE=drive
GOOGLE_SERVICE_ACCOUNT_KEY=./credentials.json
GOOGLE_DRIVE_FOLDER_ID=<paste-folder-id-here>
```

6. Restart the server.

---

## 🔧 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `STORAGE_MODE` | `local` | `local` or `drive` |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `./credentials.json` | Path to GCP service-account key |
| `GOOGLE_DRIVE_FOLDER_ID` | *(empty)* | Target Drive folder ID |

---

## 📱 How It Works

1. **Consent Screen** – clear explanation of what the app does; user must check the consent box.
2. **Camera Permission** – browser's native `getUserMedia` prompt.
3. **Front Photo** – user taps the shutter button.
4. **Rear Photo** – camera auto-switches; user taps shutter again.
5. **Upload** – both photos are sent to the backend via `POST /api/upload`.
6. **Storage** – saved locally or uploaded to Google Drive with timestamp + device info.

---

## 🌐 Testing on Mobile (same Wi-Fi)

Camera APIs require HTTPS or `localhost`. For LAN testing:

```bash
# Option A: use ngrok for a free HTTPS tunnel
npx ngrok http 3000

# Option B: use localtunnel
npx localtunnel --port 3000
```

Open the HTTPS URL on your phone.

---

## ⚠️ Ethics & Disclaimer

This project is for **educational purposes only** as part of a university
cybersecurity curriculum. It demonstrates:

- How browsers gate hardware access behind permissions
- The importance of informed consent in web applications
- How easily captured data can be exfiltrated once permission is granted

**Do NOT use this tool to capture images without consent.** Always comply with
local privacy laws and your institution's ethics policies.

---

## 📄 License

MIT
