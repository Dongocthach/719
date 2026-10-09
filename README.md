# 719 — DuyAnhTod Cloud Code Admin

Express backend for Unity Cloud Code, with a **Vue 3 + Vite** single-page front end.

## Layout

```
server.js                 Express server: API routes + serves the built SPA
unityCloudCodeClient.js   Unity Cloud Code client (token exchange, retry)
index.js                  CLI smoke test for the SayHello function
client/                   Vue 3 source (Vite project root)
  index.html              SPA entry
  vite.config.js          Vite config; builds into ../public
  src/
    main.js               App bootstrap
    App.vue               Root component (just <router-view>)
    router/index.js       Routes: / -> admin, /chat -> chat
    api/index.js          All backend calls + admin key handling
    composables/          Reusable state (chat conversations)
    views/                AdminView, ChatView
    components/           AppNav, cards, sidebar, messages, logs
images/                   Source images, published as static assets at /1.png
public/                   Build output served by Express (committed)
```

## Setup

```bash
npm install
cp .env.example .env      # then fill in the values
```

At minimum set `ADMIN_API_KEY` plus the four `UNITY_*` variables.

> **Windows note:** if `npm` fails with *"running scripts is disabled on this
> system"*, your PowerShell execution policy blocks `npm.ps1` / `npx.ps1`.
> Use `npm.cmd` / `npx.cmd` instead, or run
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Running

Two processes during development:

```bash
npm run server   # Express on http://localhost:3000
npm run dev      # Vite dev server on http://localhost:5173 (HMR)
```

Open **http://localhost:5173**. Vite proxies `/say-hello`,
`/DeletePlayerDataByPlayerId`, `/ai`, and `/chat-logs` to port 3000.

For production, build and let Express serve everything from one origin:

```bash
npm run build    # writes the bundle into public/
npm start        # http://localhost:3000
```

`npm run build` **deletes and rewrites `public/`**, so never hand-edit files
there — they are build output. Edit `client/src` instead.

`images/` is wired up as Vite's `publicDir`, so files there are served at the
site root in dev (`/1.png`) and copied into `public/` on build. Add images
there rather than into `public/`.

### Hero image

`images/1.png` is 416×610 — portrait and low resolution. It is laid out beside
the hero text at its native size (never upscaled past 416px) rather than used
as a full-bleed background, which would crop it to a sliver and blur it on a
desktop. Below 900px the hero stacks and centres. If you want a true
full-width banner, supply a landscape image at least ~1920px wide and swap
`.hero-art` for a background treatment in `client/src/views/AdminView.vue`.

## Routes

| Route | View |
|---|---|
| `/` | Admin page — hero, admin key panel, Say Hello, Delete Player Data |
| `/chat` | AI chat — sidebar history, message thread, global log viewer |

The server has an SPA fallback, so deep links and refreshes on `/chat` work.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/say-hello` | `x-admin-api-key` | Calls the `SayHello` Cloud Code function |
| POST | `/DeletePlayerDataByPlayerId` | `x-admin-api-key` | Deletes a player's Cloud Save |
| POST | `/ai` | none | AI chat — currently a **stub reply** |
| GET | `/chat-logs` | none | Every recorded chat exchange |

### Admin key

The two admin endpoints require an `x-admin-api-key` header. Paste the same
value as `ADMIN_API_KEY` into the **Admin API Key** panel on the admin page;
it is kept in that browser's `localStorage` and attached automatically.

Because `GET /chat-logs` is unauthenticated and returns every user's messages,
do not expose this server publicly as-is.

## Known gaps

- `POST /ai` returns a hardcoded stub. `.env` documents a `SCAM_API_URL`
  scam-detection backend and a rule-based fallback that were never implemented.
- `chat-logs.json` is a single JSON file rewritten on every message — fine for
  a demo, not for concurrent traffic.
