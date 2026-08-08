(function startPopup() {
  "use strict";

  const utils = window.ChatTimeUtils;
  const defaults = utils.DEFAULT_SETTINGS;
  const ids = ["enabled", "clock", "showDate", "showSeconds", "timezone", "display", "placement", "appearance"];
  const controls = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const preview = document.getElementById("previewTime");
  const saveState = document.getElementById("saveState");

  function readForm() {
    return utils.normalizeSettings({
      enabled: controls.enabled.checked,
      clock: controls.clock.value,
      showDate: controls.showDate.checked,
      showSeconds: controls.showSeconds.checked,
      timezone: controls.timezone.value,
      display: controls.display.value,
      placement: controls.placement.value,
      appearance: controls.appearance.value
    });
  }

  function writeForm(rawSettings) {
    const settings = utils.normalizeSettings(rawSettings);
    controls.enabled.checked = settings.enabled;
    controls.clock.value = settings.clock;
    controls.showDate.checked = settings.showDate;
    controls.showSeconds.checked = settings.showSeconds;
    controls.timezone.value = settings.timezone;
    controls.display.value = settings.display;
    controls.placement.value = settings.placement;
    controls.appearance.value = settings.appearance;
    updatePreview(settings);
  }

  function updatePreview(settings = readForm()) {
    preview.textContent = utils.formatTimestamp(new Date(), settings);
    preview.classList.toggle("chip", settings.appearance === "chip");
  }

  function save() {
    const settings = readForm();
    updatePreview(settings);
    saveState.textContent = "Saving…";
    chrome.storage.sync.set(settings, () => {
      saveState.textContent = "Saved in browser";
    });
  }

  for (const control of Object.values(controls)) control.addEventListener("change", save);

  document.getElementById("reset").addEventListener("click", () => {
    writeForm(defaults);
    chrome.storage.sync.set(defaults, () => {
      saveState.textContent = "Defaults restored";
    });
  });

  chrome.storage.sync.get(defaults, writeForm);
})();
