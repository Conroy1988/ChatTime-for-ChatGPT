const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const projectRoot = path.resolve(__dirname, "..");
const utilsSource = fs.readFileSync(path.join(projectRoot, "extension/content/time-utils.js"), "utf8");
const pageSource = fs.readFileSync(path.join(projectRoot, "extension/content/page.js"), "utf8");

function createPage(settings = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <main>
      <section data-turn-id="turn-1">
        <div data-message-author-role="user">
          <div data-message-id="message-1"><p>Hello world</p></div>
        </div>
      </section>
    </main>
  </body></html>`, {
    runScripts: "outside-only",
    url: "https://chatgpt.com/c/example"
  });

  dom.window.document.documentElement.setAttribute("data-chattime-settings", JSON.stringify(settings));
  const message = dom.window.document.querySelector("[data-message-id]");
  message.__reactFiber$test = {
    memoizedProps: {
      messages: [{ id: "message-1", create_time: 1786225805, author: { role: "user" } }]
    },
    return: null
  };

  dom.window.eval(utilsSource);
  dom.window.eval(pageSource);
  return dom;
}

function settle(dom) {
  return new Promise((resolve) => dom.window.setTimeout(resolve, 30));
}

test("adds exactly one original timestamp and preserves message text", async () => {
  const dom = createPage({ timezone: "utc", clock: "24", showSeconds: true });
  await settle(dom);

  const stamps = dom.window.document.querySelectorAll(".chattime-stamp");
  assert.equal(stamps.length, 1);
  assert.equal(stamps[0].dateTime, "2026-08-08T21:50:05.000Z");
  assert.match(stamps[0].textContent, /21:50:05/);
  assert.equal(dom.window.document.querySelector("p").textContent, "Hello world");

  dom.window.document.body.append(dom.window.document.createElement("aside"));
  await settle(dom);
  assert.equal(dom.window.document.querySelectorAll(".chattime-stamp").length, 1);
  dom.window.close();
});

test("honours role filtering", async () => {
  const dom = createPage({ display: "assistant" });
  await settle(dom);
  assert.equal(dom.window.document.querySelectorAll(".chattime-stamp").length, 0);
  dom.window.close();
});

test("re-renders when settings change", async () => {
  const dom = createPage({ timezone: "utc", showSeconds: false });
  await settle(dom);
  assert.doesNotMatch(dom.window.document.querySelector(".chattime-stamp").textContent, /:05(?:\s|$)/);

  dom.window.document.documentElement.setAttribute("data-chattime-settings", JSON.stringify({
    timezone: "utc",
    showSeconds: true,
    placement: "below",
    appearance: "chip"
  }));
  dom.window.dispatchEvent(new dom.window.Event("chattime:settings-changed"));
  await settle(dom);

  const stamp = dom.window.document.querySelector(".chattime-stamp");
  assert.match(stamp.textContent, /21:50:05/);
  assert.equal(stamp.dataset.placement, "below");
  assert.equal(stamp.classList.contains("chattime-stamp--chip"), true);
  dom.window.close();
});
