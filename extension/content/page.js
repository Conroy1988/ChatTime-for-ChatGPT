(function startChatTime() {
  "use strict";

  const INITIALIZED = Symbol.for("chattime-for-chatgpt.initialized");
  if (window[INITIALIZED]) return;
  window[INITIALIZED] = true;

  const utils = window.ChatTimeUtils;
  if (!utils) return;

  const SETTINGS_ATTRIBUTE = "data-chattime-settings";
  const SETTINGS_EVENT = "chattime:settings-changed";
  const REQUEST_EVENT = "chattime:request-settings";
  const STAMP_SELECTOR = ".chattime-stamp";
  const TURN_SELECTOR = "section[data-turn-id], article[data-testid^='conversation-turn-']";
  const MESSAGE_SELECTOR = "[data-message-id]";
  const MAX_RETRY_SCANS = 30;

  let settings = utils.normalizeSettings();
  let scanTimer = 0;
  let retryScans = 0;
  let lastUrl = location.href;

  function readSettings() {
    const encoded = document.documentElement?.getAttribute(SETTINGS_ATTRIBUTE);
    if (!encoded) return utils.normalizeSettings();

    try {
      return utils.normalizeSettings(JSON.parse(encoded));
    } catch {
      return utils.normalizeSettings();
    }
  }

  function getRole(turn, messageElement, message) {
    const messageRole = message?.author?.role;
    if (messageRole === "user" || messageRole === "assistant") return messageRole;

    const roleElement = messageElement.closest("[data-message-author-role]")
      || turn.closest("[data-message-author-role]")
      || turn.querySelector("[data-message-author-role]");
    const domRole = roleElement?.getAttribute("data-message-author-role");
    return domRole === "user" || domRole === "assistant" ? domRole : "";
  }

  function plausibleCreateTime(value) {
    const date = utils.epochToDate(value);
    if (!date) return false;
    const year = date.getUTCFullYear();
    return year >= 2022 && year <= 2200;
  }

  function inspectMessageCandidate(value, expectedId, state, depth) {
    if (!value || typeof value !== "object" || depth > 4 || state.visited.has(value)) return null;
    state.visited.add(value);
    state.inspected += 1;
    if (state.inspected > 180) return null;

    if (plausibleCreateTime(value.create_time)) {
      const id = value.id || value.message_id;
      if (!expectedId || !id || String(id) === expectedId) return value;
      state.fallback ||= value;
    }

    const preferredKeys = ["message", "messages", "currentMessage", "value", "node"];
    for (const key of preferredKeys) {
      const child = value[key];
      if (Array.isArray(child)) {
        for (const item of child.slice(0, 8)) {
          const match = inspectMessageCandidate(item, expectedId, state, depth + 1);
          if (match) return match;
        }
      } else {
        const match = inspectMessageCandidate(child, expectedId, state, depth + 1);
        if (match) return match;
      }
    }

    return null;
  }

  function messageFromReact(element, expectedId) {
    for (const sourceElement of [element, element.parentElement, element.closest(TURN_SELECTOR)]) {
      if (!sourceElement) continue;
      const fiberKey = Object.keys(sourceElement).find((key) => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$"));
      if (!fiberKey) continue;

      let fiber = sourceElement[fiberKey];
      const state = { visited: new WeakSet(), inspected: 0, fallback: null };
      for (let depth = 0; fiber && depth < 40; depth += 1, fiber = fiber.return) {
        for (const props of [fiber.memoizedProps, fiber.pendingProps]) {
          const exact = inspectMessageCandidate(props, expectedId, state, 0);
          if (exact) return exact;
        }
      }
      if (state.fallback) return state.fallback;
    }

    return null;
  }

  function timestampFromDom(messageElement) {
    const candidates = [
      messageElement.getAttribute("data-create-time"),
      messageElement.getAttribute("data-message-create-time"),
      messageElement.querySelector("time[datetime]")?.getAttribute("datetime")
    ];

    return candidates.find(plausibleCreateTime) || null;
  }

  function makeStamp(createTime, role) {
    const date = utils.epochToDate(createTime);
    if (!date) return null;

    const stamp = document.createElement("time");
    stamp.className = `chattime-stamp chattime-stamp--${settings.appearance}`;
    stamp.dateTime = date.toISOString();
    stamp.dir = "ltr";
    stamp.dataset.role = role;
    stamp.dataset.placement = settings.placement;
    stamp.textContent = utils.formatTimestamp(date, settings);
    stamp.title = utils.buildTooltip(date, settings);
    stamp.setAttribute("aria-label", `${role === "user" ? "Sent" : "Received"} ${stamp.textContent}`);
    return stamp;
  }

  function turnRoots() {
    const turns = Array.from(document.querySelectorAll(TURN_SELECTOR));
    if (turns.length) return turns;

    return Array.from(document.querySelectorAll(MESSAGE_SELECTOR)).filter((element) => {
      return !element.parentElement?.closest(MESSAGE_SELECTOR);
    });
  }

  function processTurn(turn) {
    const messageElement = turn.matches(MESSAGE_SELECTOR) ? turn : turn.querySelector(MESSAGE_SELECTOR);
    if (!messageElement || messageElement.querySelector(STAMP_SELECTOR)) return true;

    const expectedId = messageElement.getAttribute("data-message-id") || turn.getAttribute("data-turn-id") || "";
    const message = messageFromReact(messageElement, expectedId);
    const role = getRole(turn, messageElement, message);
    if (!utils.shouldDisplayForRole(role, settings)) return true;

    const createTime = message?.create_time ?? timestampFromDom(messageElement);
    if (!plausibleCreateTime(createTime)) return false;

    const stamp = makeStamp(createTime, role);
    if (!stamp) return false;

    if (settings.placement === "below") messageElement.append(stamp);
    else messageElement.prepend(stamp);
    return true;
  }

  function scan() {
    scanTimer = 0;

    if (location.href !== lastUrl) {
      lastUrl = location.href;
      retryScans = 0;
    }

    if (!settings.enabled) return;
    const roots = turnRoots();
    const unresolved = roots.reduce((count, turn) => count + (processTurn(turn) ? 0 : 1), 0);

    if (unresolved > 0 && retryScans < MAX_RETRY_SCANS) {
      retryScans += 1;
      scanTimer = window.setTimeout(scan, 1000);
    } else if (unresolved === 0) {
      retryScans = 0;
    }
  }

  function scheduleScan(delay = 100) {
    if (scanTimer) return;
    scanTimer = window.setTimeout(scan, delay);
  }

  function applySettings() {
    settings = readSettings();
    document.querySelectorAll(STAMP_SELECTOR).forEach((stamp) => stamp.remove());
    retryScans = 0;
    scheduleScan(0);
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => {
      return node.nodeType === Node.ELEMENT_NODE && !node.classList?.contains("chattime-stamp");
    }))) scheduleScan();
  });

  function begin() {
    settings = readSettings();
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleScan(0);
    window.dispatchEvent(new Event(REQUEST_EVENT));
  }

  window.addEventListener(SETTINGS_EVENT, applySettings);

  if (document.body) begin();
  else document.addEventListener("DOMContentLoaded", begin, { once: true });
})();
