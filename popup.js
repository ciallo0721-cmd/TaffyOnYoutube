const DEFAULT_SETTINGS = {
  enabled: true,
  size: 35,
  position: "random"
};

const enabledInput = document.querySelector("#enabled");
const sizeInput = document.querySelector("#size");
const sizeValue = document.querySelector("#sizeValue");
const positionInput = document.querySelector("#position");
const statusText = document.querySelector("#status");

let saveDebounceId = 0;
let statusDebounceId = 0;

function normalizeSettings(settings) {
  const size = Number(settings.size);
  const position = ["bottom-right", "bottom-left", "random"].includes(settings.position)
    ? settings.position
    : DEFAULT_SETTINGS.position;

  return {
    enabled: settings.enabled !== false,
    size: Number.isFinite(size) ? Math.min(60, Math.max(20, size)) : DEFAULT_SETTINGS.size,
    position
  };
}

function updateSizeLabel() {
  sizeValue.value = `${sizeInput.value}%`;
}

function showStatus(message) {
  window.clearTimeout(statusDebounceId);
  statusText.textContent = message;
  statusDebounceId = window.setTimeout(() => {
    statusText.textContent = "";
  }, 1400);
}

function currentSettings() {
  return {
    enabled: enabledInput.checked,
    size: Number(sizeInput.value),
    position: positionInput.value
  };
}

function saveSettings() {
  window.clearTimeout(saveDebounceId);
  saveDebounceId = window.setTimeout(() => {
    chrome.storage.sync.set(currentSettings(), () => {
      if (chrome.runtime.lastError) {
        showStatus("Could not save settings.");
        return;
      }

      showStatus("Saved.");
    });
  }, 100);
}

function applySettings(settings) {
  enabledInput.checked = settings.enabled;
  sizeInput.value = settings.size;
  positionInput.value = settings.position;
  updateSizeLabel();
}

chrome.storage.sync.get(DEFAULT_SETTINGS, (storedSettings) => {
  applySettings(normalizeSettings(storedSettings));
});

enabledInput.addEventListener("change", saveSettings);
positionInput.addEventListener("change", saveSettings);
sizeInput.addEventListener("input", () => {
  updateSizeLabel();
  saveSettings();
});
