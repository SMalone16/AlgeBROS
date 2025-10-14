# AlgeBROS MVP Scaffold

This repository bootstraps the AlgeBROS tactical math battler with a strict
TypeScript + React (Vite) toolchain. The current implementation focuses on
layout, state stubs, and developer experience so that core gameplay systems can
be implemented iteratively.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Launch the development server**
   ```bash
   npm run dev
   ```
3. **Run the production build**
   ```bash
   npm run build
   ```
4. **Preview the production build locally**
   ```bash
   npm run preview
   ```
5. **Execute the Vitest suite**
   ```bash
   npm run test
   ```
6. **Lint the codebase**
   ```bash
   npm run lint
   ```

> **Node.js** 18 or newer is recommended to match the defaults provided by Vite
> and Vitest.

## Project Structure

```
src/
├── components/          # Canvas-driven presentation layer (GameBoard stub today)
├── game/                # Core game-loop utilities (initializeBoard, territoryManager, movementResolver)
├── math/                # mathjs-powered helpers for algebraic validation
├── state/               # Zustand stores for players, ships, and the turn timer
├── tests/               # Vitest suites tracking rules + territory coverage TODOs
├── types/               # Shared TypeScript interfaces for the MVP spec
├── assets/              # Static assets bundled by Vite
├── index.css            # Global styles for the placeholder UI
└── main.tsx             # StrictMode bootstrap rendering the GameBoard canvas
```

### Module Roadmap

- **components/GameBoard** – Renders the tactical grid placeholder and is ready
  to subscribe to state selectors for live updates. TODOs highlight animation
  and interaction work once ship+territory systems solidify.
- **game/** – Hosts stubs for `initializeBoard`, `territoryManager`, and
  `movementResolver`. Each function throws until the underlying algorithms are
  defined, providing clear touchpoints for future work.
- **state/** – Houses three Zustand stores (`playerStore`, `shipStore`, and
  `timerStore`) with baseline actions and selectors. Comments document the
  selectors/actions expected by the MVP.
- **math/** – Wraps mathjs to evaluate expressions and seed future equation
  generators, keeping algebra tooling centralized.
- **tests/** – Contains Vitest `test.todo` placeholders for rules validation and
  territory scoring coverage, ensuring we track upcoming QA needs.

## Tooling Highlights

- **Strict TypeScript** – `tsconfig.app.json` and `tsconfig.node.json` enable
  `strict`, `noImplicitAny`, `strictNullChecks`, and related flags to surface
  issues early.
- **ESLint** – The Vite starter configuration is included and can be extended as
  the ruleset matures.
- **Vitest + Testing Library** – Added for component and logic testing using a
  `jsdom` environment. Open `vitest.config.ts` to adjust reporters or setup
  files as features ship.

## Next Steps

- Flesh out the TODOs across the `game/` utilities and Zustand stores based on
  the finalized MVP rules.
- Connect the `GameBoard` canvas to real board state updates and animate ship
  movement.
- Populate the Vitest suites with concrete acceptance criteria for algebraic
  move validation and territory scoring.
