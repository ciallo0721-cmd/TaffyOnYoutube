(() => {
  "use strict";

  const FALLBACK_TAFFY_IMAGE_URL = chrome.runtime.getURL("images/taffy.png");
  let taffyImageUrls = [FALLBACK_TAFFY_IMAGE_URL];
  let taffyAssetVersion = "fallback";

  const THUMBNAIL_SELECTOR = [
    "ytd-thumbnail",
    "yt-thumbnail-view-model",
    "a.yt-lockup-view-model-wiz__content-image",
    "ytd-rich-grid-media ytd-thumbnail",
    "ytd-video-renderer ytd-thumbnail",
    "ytd-compact-video-renderer ytd-thumbnail"
  ].join(", ");

  const DEFAULT_SETTINGS = {
    enabled: true,
    size: 35,
    position: "random"
  };

  let settings = { ...DEFAULT_SETTINGS };
  let debounceId = 0;
  let steadyScanId = 0;

  function normalizeSettings(nextSettings) {
    const size = Number(nextSettings.size);
    const position = ["bottom-right", "bottom-left", "random"].includes(nextSettings.position)
      ? nextSettings.position
      : DEFAULT_SETTINGS.position;

    return {
      enabled: nextSettings.enabled !== false,
      size: Number.isFinite(size) ? Math.min(60, Math.max(20, size)) : DEFAULT_SETTINGS.size,
      position
    };
  }

  function getRandomSide(thumbnail) {
    if (!thumbnail.dataset.taffySide) {
      thumbnail.dataset.taffySide = Math.random() < 0.5 ? "left" : "right";
    }

    return thumbnail.dataset.taffySide;
  }

  function getRandomScale(thumbnail) {
    if (!thumbnail.dataset.taffyScale) {
      thumbnail.dataset.taffyScale = (0.8 + Math.random() * 0.4).toFixed(3);
    }

    return Number(thumbnail.dataset.taffyScale);
  }

  function getRandomRotation(thumbnail) {
    if (!thumbnail.dataset.taffyRotation) {
      thumbnail.dataset.taffyRotation = (-4 + Math.random() * 8).toFixed(2);
    }

    return Number(thumbnail.dataset.taffyRotation);
  }

  function getRandomImageUrl(thumbnail) {
    if (!taffyImageUrls.length) {
      return FALLBACK_TAFFY_IMAGE_URL;
    }

    if (thumbnail.dataset.taffyAssetVersion !== taffyAssetVersion) {
      thumbnail.dataset.taffyAssetVersion = taffyAssetVersion;
      delete thumbnail.dataset.taffyImageIndex;
    }

    if (!thumbnail.dataset.taffyImageIndex) {
      thumbnail.dataset.taffyImageIndex = String(Math.floor(Math.random() * taffyImageUrls.length));
    }

    const imageIndex = Number(thumbnail.dataset.taffyImageIndex);
    return taffyImageUrls[imageIndex] || FALLBACK_TAFFY_IMAGE_URL;
  }

  function resolveSide(thumbnail) {
    if (settings.position === "bottom-left") {
      return "left";
    }

    if (settings.position === "bottom-right") {
      return "right";
    }

    return getRandomSide(thumbnail);
  }

  function getOverlayWidth(thumbnail) {
    const width = settings.size * getRandomScale(thumbnail);
    return Math.round(width * 10) / 10;
  }

  function createOverlay() {
    const overlay = document.createElement("img");
    overlay.className = "taffy-overlay";
    overlay.alt = "";
    overlay.decoding = "async";
    overlay.loading = "lazy";
    overlay.dataset.taffyOverlay = "true";
    return overlay;
  }

  function createOverlayLayer() {
    const layer = document.createElement("div");
    layer.className = "taffy-overlay-layer";
    layer.dataset.taffyOverlayLayer = "true";
    return layer;
  }

  function normalizeThumbnailElement(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    const legacyThumbnail = element.matches("ytd-thumbnail")
      ? element
      : element.closest("ytd-thumbnail");

    if (legacyThumbnail) {
      return legacyThumbnail;
    }

    const modernThumbnail = element.matches("yt-thumbnail-view-model")
      ? element
      : element.querySelector("yt-thumbnail-view-model") || element.closest("yt-thumbnail-view-model");

    if (modernThumbnail) {
      return modernThumbnail;
    }

    return element;
  }

  function getOverlayLayer(thumbnail) {
    let layer = thumbnail.querySelector(":scope > .taffy-overlay-layer");

    if (!layer) {
      layer = createOverlayLayer();
      thumbnail.appendChild(layer);
    }

    return layer;
  }

  function updateOverlay(thumbnail, overlay) {
    const side = resolveSide(thumbnail);
    const imageUrl = getRandomImageUrl(thumbnail);
    const widthValue = `${getOverlayWidth(thumbnail)}%`;
    const rotationValue = `${getRandomRotation(thumbnail)}deg`;

    thumbnail.classList.add("taffy-thumbnail-target");
    if (overlay.src !== imageUrl) {
      overlay.src = imageUrl;
    }

    if (overlay.style.getPropertyValue("--taffy-width") !== widthValue) {
      overlay.style.setProperty("--taffy-width", widthValue);
    }

    if (overlay.style.getPropertyValue("--taffy-rotation") !== rotationValue) {
      overlay.style.setProperty("--taffy-rotation", rotationValue);
    }

    overlay.classList.toggle("taffy-overlay--left", side === "left");
    overlay.classList.toggle("taffy-overlay--right", side === "right");
    overlay.classList.toggle("taffy-overlay--hidden", !settings.enabled);
  }

  function processThumbnail(thumbnail) {
    thumbnail = normalizeThumbnailElement(thumbnail);

    if (!(thumbnail instanceof HTMLElement)) {
      return;
    }

    thumbnail.dataset.taffyProcessed = "true";

    const overlayLayer = getOverlayLayer(thumbnail);
    let overlay = overlayLayer.querySelector(":scope > .taffy-overlay");

    // YouTube frequently rebuilds thumbnail internals. Keep one overlay in our
    // own layer so hover previews and route changes do not create duplicates.
    thumbnail.querySelectorAll(".taffy-overlay").forEach((existingOverlay) => {
      if (existingOverlay !== overlay) {
        existingOverlay.remove();
      }
    });

    if (!overlay) {
      overlay = createOverlay();
      overlayLayer.appendChild(overlay);
    }

    updateOverlay(thumbnail, overlay);
  }

  function processThumbnails(root = document) {
    const thumbnails = new Set();
    const addThumbnail = (element) => {
      const thumbnail = normalizeThumbnailElement(element);

      if (thumbnail) {
        thumbnails.add(thumbnail);
      }
    };

    if (root instanceof HTMLElement && root.matches(THUMBNAIL_SELECTOR)) {
      addThumbnail(root);
    }

    if (root.querySelectorAll) {
      root.querySelectorAll(THUMBNAIL_SELECTOR).forEach(addThumbnail);
    }

    thumbnails.forEach(processThumbnail);
  }

  function scheduleProcessThumbnails(root = document) {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => processThumbnails(root), 120);
  }

  function isThumbnailRelatedNode(node) {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      node.matches(THUMBNAIL_SELECTOR) ||
        node.closest("ytd-thumbnail, yt-thumbnail-view-model, a.yt-lockup-view-model-wiz__content-image") ||
        node.querySelector?.(THUMBNAIL_SELECTOR)
    );
  }

  function readSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (storedSettings) => {
      settings = normalizeSettings(storedSettings);
      scheduleProcessThumbnails();
    });
  }

  async function loadTaffyAssets() {
    try {
      const response = await fetch(chrome.runtime.getURL("images/assets.json"), {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Could not load assets.json: ${response.status}`);
      }

      const assetManifest = await response.json();
      const imageFiles = Array.isArray(assetManifest.images) ? assetManifest.images : [];
      const pngFiles = imageFiles.filter((file) => typeof file === "string" && file.endsWith(".png"));

      if (pngFiles.length) {
        taffyImageUrls = pngFiles.map((file) => chrome.runtime.getURL(file));
        taffyAssetVersion = pngFiles.join("|");
      }
    } catch (error) {
      console.warn("[Taffy Overlay] Falling back to images/taffy.png.", error);
    }
  }

  function watchForNewThumbnails() {
    const observer = new MutationObserver((mutations) => {
      const shouldProcess = mutations.some((mutation) => {
        if (
          mutation.target instanceof HTMLElement &&
          mutation.target.closest(".taffy-overlay-layer")
        ) {
          return false;
        }

        if (
          isThumbnailRelatedNode(mutation.target) ||
          Array.from(mutation.addedNodes).some(isThumbnailRelatedNode) ||
          Array.from(mutation.removedNodes).some(isThumbnailRelatedNode)
        ) {
          return true;
        }

        return false;
      });

      if (shouldProcess) {
        scheduleProcessThumbnails();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "src", "hidden", "style", "class"]
    });
  }

  function startSteadyScan() {
    window.clearInterval(steadyScanId);
    steadyScanId = window.setInterval(() => processThumbnails(), 1000);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    settings = normalizeSettings({
      enabled: changes.enabled ? changes.enabled.newValue : settings.enabled,
      size: changes.size ? changes.size.newValue : settings.size,
      position: changes.position ? changes.position.newValue : settings.position
    });

    scheduleProcessThumbnails();
  });

  async function start() {
    await loadTaffyAssets();
    readSettings();
    watchForNewThumbnails();
    startSteadyScan();
    scheduleProcessThumbnails();
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }
})();
