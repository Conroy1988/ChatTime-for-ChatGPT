(function startChatTimeBridge() {
  "use strict";

  const SETTINGS_ATTRIBUTE = "data-chattime-settings";
  const SETTINGS_EVENT = "chattime:settings-changed";
  const REQUEST_EVENT = "chattime:request-settings";
  const DEFAULT_SETTINGS = {
    enabled: true,
    clock: "24",
    showDate: true,
    showSeconds: false,
    timezone: "local",
    display: "all",
    placement: "above",
    appearance: "quiet"
  };

  function publish(settings) {
    const root = document.documentElement;
    if (!root) return;

    root.setAttribute(SETTINGS_ATTRIBUTE, JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }));
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  }

  function load() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, publish);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    if (Object.keys(changes).some((key) => key in DEFAULT_SETTINGS)) load();
  });

  window.addEventListener(REQUEST_EVENT, load);

  if (document.documentElement) load();
  else document.addEventListener("DOMContentLoaded", load, { once: true });
})();
