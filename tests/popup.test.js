const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const popupPath = path.resolve(__dirname, "../extension/popup/popup.html");
const popupHtml = fs.readFileSync(popupPath, "utf8");

test("Ko-fi support link is optional, canonical, and safely isolated", () => {
  const dom = new JSDOM(popupHtml);
  const link = dom.window.document.querySelector(".support-card");

  assert.ok(link);
  assert.equal(link.href, "https://ko-fi.com/D4P124RWI9");
  assert.equal(link.target, "_blank");
  assert.equal(link.rel, "noopener noreferrer");
  assert.match(link.textContent, /Support the project on Ko-fi/);
  assert.equal(link.querySelector("img"), null);

  dom.window.close();
});
