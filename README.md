# Homo Economicus

> The rational mind for irrational times.

Homo Economicus is a polished decision-analysis app for thinking through high-stakes trade-offs. Describe a decision and it streams a structured recommendation grounded in rational choice, game theory, prospect theory, Bayesian reasoning, expected utility, and related decision frameworks.

The app now runs as both a web app and an Electron desktop app for Windows and macOS.

## What Works

- Prompt-first AI interface inspired by modern frontier AI products
- Live Gemini streaming responses with theory badges parsed from model output
- Device-local Gemini key settings
- Conversation history, active chat restore, delete without browser confirmation popups, and local profile sign-in
- Inline status messages instead of disruptive notifications
- Responsive web UI and Electron desktop shell
- Windows and macOS packaging scripts through Electron Builder

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Add your Gemini API key from the sidebar Settings control before sending an analysis. Keys are stored only on the current device.

## Desktop App

Run the desktop app locally:

```bash
npm run desktop
```

Create unpacked desktop builds:

```bash
npm run desktop:pack
```

Create downloadable installers/packages:

```bash
npm run desktop:dist:win
npm run desktop:dist:mac
```

Artifacts are written to `release/`.

Windows builds can be produced on Windows. macOS signed/notarized distributables should be produced on macOS with Apple signing credentials.

## Scripts

```bash
npm run dev              # start Vite
npm run build            # production web build to dist/
npm run preview          # preview the production web build
npm run desktop          # build and launch Electron locally
npm run desktop:pack     # build unpacked Electron app
npm run desktop:dist     # build desktop distributables for the host OS
npm run desktop:dist:win # build Windows installer and zip
npm run desktop:dist:mac # build macOS dmg and zip
```

## Project Structure

```text
electron/
  main.cjs           # Electron main process
  preload.cjs        # Isolated preload bridge
src/
  api/
    gemini.js        # Gemini streaming + model fallback handling
    systemPrompt.js  # AI persona, theory map, response contract
  chat/
    ChatEngine.js
    MessageRenderer.js
  components/
  styles/
```

## Production Notes

For a hosted web product, move Gemini calls behind a backend API proxy so API keys are never exposed to the browser. For desktop distribution, add platform-specific code signing before public release.
