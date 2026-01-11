# Solace — Privacy-first journaling companion (prototype)
 
 Solace is a lightweight journaling app designed to help users build a daily writing habit and gently surface patterns over time.
 
 ## Problem
 People want to journal consistently, but friction ("I don’t know what to write"), low energy, and fear of being judged can make the habit hard to sustain.
 
 ## Solution (what this prototype demonstrates)
 - **Low-pressure journaling UX**: starter chips, fast Save/Update, and optional “Reflect draft” so users can get value without committing.

  - **Guided Session**: a 5‑minute structured journal that saves as one entry and generates a reflection.
  - **Insights**: mood timeline, weekly snapshot, top themes, and "what seems to help" — all computed locally.

  ## Privacy & trust
  - **Insights never send journal text over the network.** A network guard is installed on the Insights page to enforce this.
  - **Privacy Mode ON**: reflections are generated locally in the browser.
  - **Privacy Mode OFF**: reflections can use an external LLM (requires an API key). The UI explicitly discloses this and asks for confirmation.

  ## Responsible AI notes
  - **Non-diagnostic framing**: sentiment/mood labels are presented as a “lens,” not a medical claim.
  - **Limitations are explicit**: heuristics can be wrong; users are encouraged to treat results as feedback, not truth.
  - **Safety**: reflection generation includes a lightweight safety note when self-harm intent is detected.
  - **Data minimization**: “memory” is derived from the user’s saved entries and stored locally; it’s used subtly.

  ## Tech
  - React + TypeScript + Vite + Tailwind
  - Routing: `react-router-dom`
  - Testing: Vitest + React Testing Library

  ## Run locally
  ```bash
  npm install
  npm run dev
  ```

  ### Optional: enable enhanced reflections
  Set `VITE_OPENAI_API_KEY` in your environment before running `npm run dev`.

  ## Quality checks
  ```bash
  npm test
  npm run lint
  npm run build
  ```
      },
