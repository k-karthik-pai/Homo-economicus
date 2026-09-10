# Homo Economicus

> The rational mind for irrational times.

Homo Economicus is a finished Windows-first decision-analysis prototype. Describe a decision and it streams a structured Gemini recommendation grounded in rational choice, game theory, prospect theory, Bayesian reasoning, expected utility, and related frameworks.

## Product Features

- Live Gemini streaming with clear error states and a Stop control
- Structured recommendations with parsed decision-theory badges
- Multiple conversations with persistence, restore, deletion, and inline Undo
- Optional device-local display profile with no account or password collection
- Responsive web interface and hardened Electron desktop shell
- Windows-encrypted Gemini key storage in the desktop app
- Windows installer and portable zip packaging

## Requirements

- Windows 10 or 11, x64
- Internet access and a Gemini API key for live analysis
- Node.js 22.12 or newer only when developing or rebuilding the app

## Run From Source

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, then choose **Connect Gemini** in the sidebar.

Run the desktop shell locally:

```bash
npm run desktop
```

## Verify And Package

```bash
npm test                 # dependency-free chat and key-storage smoke checks
npm run verify           # smoke checks plus production web build
npm run desktop:pack     # unpacked Windows app
npm run desktop:dist     # Windows installer and zip
npm run desktop:dist:win # explicit Windows distribution alias
```

Desktop artifacts are written to `release/`. The distributable files are:

- `Homo Economicus Setup 1.0.0.exe`
- `Homo Economicus-1.0.0-win.zip`

## Local Data And Privacy

- Conversations and the optional display profile are stored on the current device.
- The Windows desktop app encrypts the Gemini key with Electron `safeStorage`, backed by Windows protection.
- The web build stores the Gemini key in that browser profile because browsers do not expose Windows secure storage.
- The key is sent to Google only in the `x-goog-api-key` request header when an analysis is submitted.
- No project-owned backend, analytics service, or cloud account system is used.

## Project Structure

```text
electron/
  main.cjs             # Windows shell, security policy, encrypted key IPC
  preload.cjs          # minimal isolated desktop bridge
scripts/
  after-pack.cjs       # removes unused stock Electron runtime files
  build-desktop.mjs    # Windows packaging helper
  smoke-chat-flow.mjs  # dependency-free behavioral verification
src/
  api/                 # Gemini streaming and decision system prompt
  chat/                # conversation state and message rendering
  components/          # sidebar, composer, settings, profile, welcome UI
  styles/              # responsive visual system
```

## Distribution Note

The generated installer is suitable for personal distribution and testing. Windows code signing is not configured, so SmartScreen may warn users who download it from the internet. Add a trusted signing certificate only if you plan a broader public release.

Licensed under the [MIT License](LICENSE).
