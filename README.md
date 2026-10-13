# NEON RUNNER

An infinite cyberpunk sprint built with [Three.js](https://threejs.org/) and [Vite](https://vitejs.dev/). Dodge neon obstacles, collect coins, and climb the global leaderboard through a Vercel serverless API.

## Features

- Three-lane endless runner with procedural track generation
- Jump and lane-switch controls
- Progressive speed scaling as your score rises
- Score and coin HUD
- Particle trail effects behind the runner
- Optional glTF runner avatar (`/models/runner.glb`) with a procedural capsule fallback
- Global leaderboard synced through `/api/leaderboard`
- Responsive full-screen WebGL canvas

## Controls

| Key | Action |
| --- | ------ |
| `A` / `ArrowLeft` | Move one lane to the left |
| `D` / `ArrowRight` | Move one lane to the right |
| `Space` / `ArrowUp` / `W` | Jump |

The runner snaps between three lanes at `x = -3, 0, 3`.

## Gameplay

- The track scrolls forward and new tiles are generated as you run.
- Obstacle boxes spawn in random lanes on each tile.
- Hitting an obstacle ends the run.
- `score += elapsed time * 18`
- Base speed starts at `14` and rises by `min(score / 180, 13)`.
- `coins = floor(score / 55)`

## Tech Stack

- **Runtime:** Browser (WebGL via Three.js)
- **Build tool:** Vite
- **3D engine:** Three.js `^0.168.0`
- **Serverless API:** Node.js on Vercel (`api/leaderboard.js`)
- **Styling:** CSS (`src/styles/hud.css`)

## Project Structure

```text
NEON_RUNNER_ENDLESS/
├── api/
│   └── leaderboard.js          # GET/POST leaderboard endpoint
├── index.html                  # Game shell and UI screens
├── package.json
├── public/
│   ├── models/                 # Optional runner.glb avatar
│   └── README.md               # Public asset notes
├── src/
│   ├── components/
│   │   ├── CollisionDetector.js
│   │   ├── GameLoop.js
│   │   ├── InputHandler.js
│   │   └── TrackGenerator.js
│   └── styles/
│       └── hud.css
└── vercel.json
```

## Development

Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Assets

Vite serves files in `public/` from the site root.

- `/models/runner.glb` (optional) — glTF runner avatar. If absent, the procedural capsule avatar is used.
- Audio and texture assets are not currently used by the game.

## Leaderboard API

`GET /api/leaderboard`

Returns the current top 10 entries.

`POST /api/leaderboard`

Submits a run. Request body:

```json
{
  "name": "Neon Runner",
  "score": 1200,
  "coins": 21
}
```

The endpoint sanitizes input, sorts by score descending (then name), keeps the top 10, and returns the updated leaderboard. Scores and coins are clamped to non-negative integers and names are trimmed to 24 characters.

> Note: the store is in-memory on the serverless function and is seeded with three demo entries. It resets on a cold start.

## Deployment

The project is configured for Vercel. `vercel.json` rewrites `/api/(.*)` to `/api/$1`, so the leaderboard endpoint is available at `/api/leaderboard
