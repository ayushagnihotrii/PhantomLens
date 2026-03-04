/**
 * app.js – Frontend logic
 * ────────────────────────
 * 1. Consent gate
 * 2. Open front camera → capture → switch to rear → capture
 * 3. Upload both images to backend
 */

(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────
  const consentScreen  = document.getElementById("consent-screen");
  const captureScreen  = document.getElementById("capture-screen");
  const doneScreen     = document.getElementById("done-screen");

  const consentCheck   = document.getElementById("consent-check");
  const consentBtn     = document.getElementById("consent-btn");

  const video          = document.getElementById("video");
  const canvas         = document.getElementById("canvas");
  const cameraLabel    = document.getElementById("camera-label");
  const captureBtn     = document.getElementById("capture-btn");
  const uploadBtn      = document.getElementById("upload-btn");

  const frontImg       = document.getElementById("front-img");
  const rearImg        = document.getElementById("rear-img");
  const frontBadge     = document.getElementById("front-badge");
  const rearBadge      = document.getElementById("rear-badge");

  const doneMsg        = document.getElementById("done-msg");
  const doneDetails    = document.getElementById("done-details");
  const restartBtn     = document.getElementById("restart-btn");
  const errorToast     = document.getElementById("error-toast");

  // ── State ─────────────────────────────────────────────
  let currentFacing = "user";        // "user" = front, "environment" = rear
  let blobs = { front: null, rear: null };
  let stream = null;

  // ── Helpers ───────────────────────────────────────────
  function showScreen(el) {
    [consentScreen, captureScreen, doneScreen].forEach(s => s.classList.remove("active"));
    el.classList.add("active");
  }

  function showToast(msg, duration = 4000) {
    errorToast.textContent = msg;
    errorToast.classList.remove("hidden");
    setTimeout(() => errorToast.classList.add("hidden"), duration);
  }

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  // ── Camera helpers ────────────────────────────────────
  async function startCamera(facingMode) {
    stopStream();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
    } catch (err) {
      // If rear camera isn't available, fall back gracefully
      if (facingMode === "environment") {
        showToast("Rear camera not available – using front camera for both shots.");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        video.srcObject = stream;
        await video.play();
      } else {
        throw err;
      }
    }
  }

  function takeSnapshot() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  }

  // ── 1. Consent ────────────────────────────────────────
  consentCheck.addEventListener("change", () => {
    consentBtn.disabled = !consentCheck.checked;
  });

  consentBtn.addEventListener("click", async () => {
    try {
      await startCamera("user");
      currentFacing = "user";
      cameraLabel.textContent = "Front Camera";
      showScreen(captureScreen);
    } catch (err) {
      showToast("Camera access denied. Please allow camera permissions and try again.");
      console.error(err);
    }
  });

  // ── 2. Capture ────────────────────────────────────────
  captureBtn.addEventListener("click", async () => {
    const blob = await takeSnapshot();

    if (currentFacing === "user") {
      // Front photo captured
      blobs.front = blob;
      frontImg.src = URL.createObjectURL(blob);
      frontImg.classList.add("taken");
      frontBadge.textContent = "✅";

      // Switch to rear
      cameraLabel.textContent = "Switching to rear camera…";
      captureBtn.disabled = true;

      try {
        await startCamera("environment");
      } catch {
        showToast("Could not switch cameras – using current feed.");
      }

      currentFacing = "environment";
      cameraLabel.textContent = "Rear Camera";
      captureBtn.disabled = false;
    } else {
      // Rear photo captured
      blobs.rear = blob;
      rearImg.src = URL.createObjectURL(blob);
      rearImg.classList.add("taken");
      rearBadge.textContent = "✅";

      stopStream();
      captureBtn.disabled = true;
      uploadBtn.disabled = false;
      cameraLabel.textContent = "Both photos captured!";
    }
  });

  // ── 3. Upload ─────────────────────────────────────────
  uploadBtn.addEventListener("click", async () => {
    uploadBtn.disabled = true;
    uploadBtn.textContent = "⏳ Uploading…";

    const formData = new FormData();
    if (blobs.front) formData.append("front", blobs.front, "front.png");
    if (blobs.rear)  formData.append("rear",  blobs.rear,  "rear.png");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Upload failed");

      doneMsg.textContent = "Your photos have been saved successfully.";
      doneDetails.innerHTML = `
        <p><strong>Session ID:</strong> ${data.sessionId}</p>
        <p><strong>Front:</strong> ${data.files?.front?.fileName || "—"}</p>
        <p><strong>Rear:</strong>  ${data.files?.rear?.fileName  || "—"}</p>
        <p><strong>Storage:</strong> ${data.files?.front?.storage || "—"}</p>
      `;
      showScreen(doneScreen);
    } catch (err) {
      showToast("Upload failed: " + err.message);
      uploadBtn.disabled = false;
      uploadBtn.textContent = "☁️ Upload Photos";
      console.error(err);
    }
  });

  // ── 4. Restart ────────────────────────────────────────
  restartBtn.addEventListener("click", () => {
    blobs = { front: null, rear: null };
    currentFacing = "user";
    frontImg.classList.remove("taken");
    rearImg.classList.remove("taken");
    frontBadge.textContent = "⏳";
    rearBadge.textContent  = "⏳";
    captureBtn.disabled = false;
    uploadBtn.disabled  = true;
    uploadBtn.textContent = "☁️ Upload Photos";
    showScreen(consentScreen);
    consentCheck.checked = false;
    consentBtn.disabled  = true;
  });
})();
