# Release test plan

## Automated

- Manifest parses and uses Manifest V3.
- Only the `storage` permission is requested.
- Content scripts match only `https://chatgpt.com/*`.
- Every manifest resource exists.
- No remote script or dynamic code execution is present.
- Unix-second, Unix-millisecond, ISO, local/UTC, 12/24-hour, and role-filter formatting tests pass.
- Simulated ChatGPT turns receive one original timestamp without altering message text.
- User-only filtering and setting updates behave correctly.
- ZIP places `manifest.json` at its root and passes an integrity checksum.

## Manual Chromium smoke test

1. Load the unpacked `extension` folder in Brave and Chrome.
2. Open an existing ChatGPT conversation and confirm both roles show original times.
3. Send a prompt and confirm one user timestamp and one reply timestamp appear during/after streaming.
4. Switch between conversations without a full page reload.
5. Toggle each popup setting and confirm immediate updates.
6. Test light mode, dark mode, narrow window, a long code response, and a right-to-left prompt.
7. Reload the browser and confirm settings persist.
8. Inspect DevTools for errors and unexpected network requests.
