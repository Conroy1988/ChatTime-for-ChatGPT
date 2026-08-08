const test = require("node:test");
const assert = require("node:assert/strict");

const utils = require("../extension/content/time-utils.js");

const sampleSeconds = 1786225805;

test("normalises settings and rejects unexpected enum values", () => {
  const settings = utils.normalizeSettings({ clock: "13", display: "system", enabled: false, showSeconds: true });
  assert.equal(settings.clock, "24");
  assert.equal(settings.display, "all");
  assert.equal(settings.enabled, false);
  assert.equal(settings.showSeconds, true);
});

test("accepts seconds, milliseconds, and ISO timestamps", () => {
  assert.equal(utils.epochToDate(sampleSeconds).toISOString(), "2026-08-08T21:50:05.000Z");
  assert.equal(utils.epochToDate(sampleSeconds * 1000).toISOString(), "2026-08-08T21:50:05.000Z");
  assert.equal(utils.epochToDate("2026-08-08T21:50:05.000Z").toISOString(), "2026-08-08T21:50:05.000Z");
  assert.equal(utils.epochToDate("not-a-time"), null);
});

test("formats a deterministic UTC 24-hour timestamp", () => {
  const text = utils.formatTimestamp(sampleSeconds, {
    clock: "24",
    timezone: "utc",
    showDate: true,
    showSeconds: true
  }, "en-GB");
  assert.equal(text, "8 Aug 2026, 21:50:05");
});

test("formats a deterministic UTC 12-hour time without a date", () => {
  const text = utils.formatTimestamp(sampleSeconds, {
    clock: "12",
    timezone: "utc",
    showDate: false,
    showSeconds: false
  }, "en-GB");
  assert.match(text, /^09:50 pm$/i);
});

test("filters supported message roles", () => {
  assert.equal(utils.shouldDisplayForRole("user", { display: "all" }), true);
  assert.equal(utils.shouldDisplayForRole("assistant", { display: "user" }), false);
  assert.equal(utils.shouldDisplayForRole("user", { display: "user" }), true);
  assert.equal(utils.shouldDisplayForRole("system", { display: "all" }), false);
  assert.equal(utils.shouldDisplayForRole("user", { enabled: false }), false);
});

test("tooltip includes a precise ISO value", () => {
  assert.match(utils.buildTooltip(sampleSeconds, { timezone: "utc" }, "en-GB"), /2026-08-08T21:50:05\.000Z/);
});
