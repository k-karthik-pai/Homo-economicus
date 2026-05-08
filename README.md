# Homo Economicus ⚖️

> *"The rational mind for irrational times"*

An AI-powered decision advisor that analyzes your scenarios through the lens of scientific decision-making theories — Game Theory, Prospect Theory, Bayesian Reasoning, and more — to deliver the most rational course of action.

## 🧠 What It Does

Describe any decision scenario, and Homo Economicus will:

1. **🎯 Recommend** a clear, actionable course of action
2. **📐 Apply scientific theories** — showing which frameworks (Game Theory, Rational Choice, etc.) inform the advice
3. **⚖️ Analyze trade-offs** — honest pros and cons of the recommended path
4. **🧠 Flag cognitive biases** — warn you about psychological traps you might fall into

## 🔬 Scientific Framework

| Theory | What It Does |
|--------|-------------|
| Rational Choice Theory | Maximize utility given constraints |
| Game Theory | Strategic analysis of multi-player scenarios |
| Prospect Theory | Account for loss aversion and psychological biases |
| Bayesian Decision Theory | Update beliefs rationally with new evidence |
| Nudge Theory | Design choice architecture for better decisions |
| Expected Utility Theory | Weigh outcomes by probability × value |
| Minimax / Maximin | Minimize worst-case loss |
| Pareto Optimality | Find win-win solutions |
| Sunk Cost Awareness | Avoid anchoring to irrecoverable past investments |
| Opportunity Cost | Always consider what you give up |

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- A free [Google AI Studio](https://aistudio.google.com) API key

### Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/Homo-economicus.git
cd Homo-economicus

# Install dependencies
npm install

# Add your API key
# Edit the .env file and replace 'your_api_key_here' with your Gemini API key

# Start the dev server
npm run dev
```

The app will open at `http://localhost:5173`

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite |
| Frontend | Vanilla JavaScript (ES Modules) |
| Styling | Vanilla CSS with Custom Properties |
| AI | Google Gemini API (streaming) |
| Fonts | Inter + Playfair Display |
| Persistence | localStorage |

## 📁 Project Structure

```
├── index.html                  # App shell
├── vite.config.js              # Vite configuration
├── .env                        # API key (git-ignored)
├── public/
│   ├── favicon.svg             # Scales of justice favicon
│   └── robots.txt              # SEO
└── src/
    ├── main.js                 # App entry point
    ├── api/
    │   ├── gemini.js           # Gemini API integration (streaming)
    │   └── systemPrompt.js     # AI persona & theory framework
    ├── chat/
    │   ├── ChatEngine.js       # Conversation management & persistence
    │   └── MessageRenderer.js  # Message rendering & markdown
    ├── components/
    │   ├── Sidebar.js          # Navigation & history
    │   ├── InputArea.js        # Message input
    │   ├── WelcomeScreen.js    # Landing screen
    │   └── AuthModal.js        # Login/Signup
    └── styles/
        ├── reset.css           # CSS reset
        ├── variables.css       # Design tokens
        ├── base.css            # Global styles
        ├── components.css      # Sidebar styles
        ├── chat.css            # Chat & message styles
        ├── modal.css           # Auth modal & toast styles
        ├── animations.css      # Keyframe animations
        └── responsive.css      # Mobile breakpoints
```

## 🗺️ Roadmap

- [x] Phase 1 — Website (current)
- [ ] Phase 2 — Backend API proxy for production security
- [ ] Phase 3 — Desktop app (Electron/Tauri)
- [ ] Phase 4 — Mobile app (React Native/Capacitor)
- [ ] Phase 5 — Decision journal, theory deep-dives, scenario comparison

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.