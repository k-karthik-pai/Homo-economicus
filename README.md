# Homo Economicus

> The rational mind for irrational times.

Homo Economicus is a decision-analysis chat prototype. Describe a decision and it returns a structured recommendation grounded in rational choice, game theory, prospect theory, Bayesian reasoning, expected utility, and related decision frameworks.

The app is intentionally shippable as a static prototype: it works immediately in demo mode, and it can use Gemini when a user adds their own API key.

## What Works

- Structured decision analysis with recommendation, theories applied, trade-offs, and cognitive-bias warnings
- Built-in demo advisor, so the app works without credentials or a backend
- Optional Gemini streaming responses via a browser-saved API key or `VITE_GEMINI_API_KEY`
- Conversation history, active chat restore, delete confirmation, and local profile sign-in for prototype use
- Theory badges parsed from model output
- Responsive dark UI with mobile sidebar, keyboard send, and streaming states

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## AI Modes

### Demo Advisor

No setup required. If no Gemini key is configured, Homo Economicus uses the built-in local advisor. This is deterministic and useful for demos, smoke tests, and sharing the prototype without exposing credentials.

If an environment key exists, the AI Mode panel can still force Demo Advisor mode for local testing.

### Gemini

Use the sidebar AI Mode control to save a Gemini API key in your browser, or create a local `.env` file:

```bash
VITE_GEMINI_API_KEY=your_key_here
```

The current Gemini fallback order is:

1. `gemini-3.5-flash`
2. `gemini-2.5-flash`
3. `gemini-2.5-flash-lite`

Browser-stored keys are fine for a bring-your-own-key prototype. For production, move Gemini calls behind a backend API proxy so keys are never exposed to the client.

## Scripts

```bash
npm run dev      # start Vite
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Project Structure

```text
src/
  api/
    gemini.js          # Gemini streaming + fallback handling
    localAdvisor.js    # built-in demo advisor
    systemPrompt.js    # AI persona, theory map, response contract
  chat/
    ChatEngine.js      # conversations, persistence, streaming callbacks
    MessageRenderer.js # message DOM + markdown-lite rendering
  components/
    ApiKeyModal.js
    AuthModal.js
    InputArea.js
    Sidebar.js
    WelcomeScreen.js
  styles/
```

## Ship Notes

This is ready to deploy as a static prototype from `dist/`. The remaining production hardening step is a backend proxy for Gemini and real authentication if you want hosted multi-user accounts.
