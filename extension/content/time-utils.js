(function attachChatTimeUtils(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.ChatTimeUtils = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createChatTimeUtils() {
  "use strict";

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    clock: "24",
    showDate: true,
    showSeconds: false,
    timezone: "local",
    display: "all",
    placement: "above",
    appearance: "quiet"
  });

  const ALLOWED = Object.freeze({
    clock: new Set(["12", "24"]),
    timezone: new Set(["local", "utc"]),
    display: new Set(["all", "user", "assistant"]),
    placement: new Set(["above", "below"]),
    appearance: new Set(["quiet", "chip"])
  });

  function normalizeSettings(value) {
    const input = value && typeof value === "object" ? value : {};
    const normalized = { ...DEFAULT_SETTINGS };

    normalized.enabled = input.enabled !== false;
    normalized.showDate = input.showDate !== false;
    normalized.showSeconds = input.showSeconds === true;

    for (const key of Object.keys(ALLOWED)) {
      if (ALLOWED[key].has(input[key])) normalized[key] = input[key];
    }

    return normalized;
  }

  function epochToDate(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value);

    if (typeof value === "string" && value.trim() !== "") {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) value = numeric;
      else {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }

    if (!Number.isFinite(value)) return null;
    const milliseconds = Math.abs(value) < 100000000000 ? value * 1000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatTimestamp(value, rawSettings, locale) {
    const date = epochToDate(value);
    if (!date) return "";

    const settings = normalizeSettings(rawSettings);
    const options = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: settings.clock === "12"
    };

    if (settings.showDate) {
      options.day = "numeric";
      options.month = "short";
      options.year = "numeric";
    }

    if (settings.showSeconds) options.second = "2-digit";
    if (settings.timezone === "utc") options.timeZone = "UTC";

    try {
      return new Intl.DateTimeFormat(locale || undefined, options).format(date);
    } catch {
      return new Intl.DateTimeFormat("en-GB", options).format(date);
    }
  }

  function buildTooltip(value, rawSettings, locale) {
    const date = epochToDate(value);
    if (!date) return "";

    const settings = normalizeSettings(rawSettings);
    const fullOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: settings.clock === "12",
      timeZoneName: "short"
    };

    if (settings.timezone === "utc") fullOptions.timeZone = "UTC";

    let readable;
    try {
      readable = new Intl.DateTimeFormat(locale || undefined, fullOptions).format(date);
    } catch {
      readable = new Intl.DateTimeFormat("en-GB", fullOptions).format(date);
    }

    return `Original message time: ${readable}\nISO 8601: ${date.toISOString()}`;
  }

  function shouldDisplayForRole(role, rawSettings) {
    const settings = normalizeSettings(rawSettings);
    if (!settings.enabled) return false;
    if (settings.display === "all") return role === "user" || role === "assistant";
    return settings.display === role;
  }

  return Object.freeze({
    DEFAULT_SETTINGS,
    normalizeSettings,
    epochToDate,
    formatTimestamp,
    buildTooltip,
    shouldDisplayForRole
  });
});
