# Dakonplete

A browser implementation of **Dakon** (Congklak mancala) with full board play, move notation import and export, undo/redo, and move-by-move replay.

Built with React 19, Vite, Zustand, Framer Motion, and Tailwind v4.

## Getting started

```bash
npm install
npm run dev       # dev server on http://localhost:2001
```

On Windows, `run.bat` does both steps and opens the browser.

## Scripts

| Command           | Description                  |
|-------------------|------------------------------|
| `npm run dev`     | Vite dev server on port 2001 |
| `npm run build`   | Production build to `dist/`  |
| `npm run preview` | Serve the production build   |
| `npm run lint`    | ESLint over the repo         |

## Board encoding

The board is a 17-slot integer array. Index 0 is unused padding, cups 1–7 are P1's row, cups 8–14 are P2's row, 15 is P1's store and 16 is P2's store. The game starts with 7 seeds per cup — 98 in total, an invariant that holds across every move.

Sowing runs counter-clockwise along `[1..7, 15, 8..14, 16]`, with each player skipping the opponent's store. Cup `i` mirrors cup `15 - i` for captures. The game ends when either row is empty, or when the two stores together hold all 98 seeds.

Live play applies these rules in `src/hooks/useDakonEngine.js`, and notation import replays them headlessly in `src/utils/notationEngine.js`.

## Notation

A turn is a single token: the cup numbers joined by `p` for each free pick, suffixed with `x` when a capture is taken and `#` when the move ends the game.

```
4p5p7p4p7p1x
```

Exports pair the P1 and P2 tokens per line and append a `[ P1 | 54-19 | P2 ]` score footer. Anything inside `[...]` is a comment and is stripped on import.

## Keyboard shortcuts

| Key                 | Action                                |
|---------------------|---------------------------------------|
| `1`–`7`             | Sow the current player's matching cup |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo                           |
| `←` / `→`           | Step through the replay               |
| `Enter` / `Escape`  | Answer the capture prompt (yes / no)  |

## Status

This repository is a partial publication. The solver and its research tooling are developed separately and are not part of this tree yet, so `src/App.jsx` currently imports a module that lands with them.

## License

Released under the [MIT License](LICENSE).