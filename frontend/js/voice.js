const VOICE_FEATURE_ENABLED = false;

const statusEl = document.getElementById("voice-status");
if (statusEl) {
    statusEl.textContent = VOICE_FEATURE_ENABLED
        ? "Modül aktif."
        : "Backend endpoint'i tanımlı (POST /api/interview/voice → 501 Not Implemented).";
}
