# AI Chat Web

A browser-based AI chat application. By default it uses a small local rule
fallback; when FastAPI is configured, the Express server securely proxies user
requests to it.

## Run locally

```bash
npm install     # only the first time
npm start       # runs `node server.js`
```

Open http://localhost:3000 in a browser.

## Connect to the FastAPI backend

Keep secrets out of `public/chat.html`. Set these environment variables when
starting the Express server:

```bash
SCAM_API_URL="http://localhost:8000/api/chat" \
APP_API_KEY="<shared-demo-key>" \
ADMIN_API_KEY="<admin-key>" \
npm start
```

The browser creates and retains a UUID for the demo user. Express adds the
secret `APP_API_KEY` before proxying chat, conversation and feedback requests
to FastAPI. It also keeps `ADMIN_API_KEY` server-side for the local admin
dashboard. If `SCAM_API_URL` is absent, the local fallback remains available.

## What it does

- Landing page is the AI chat UI (`public/chat.html`).
- Admin page (`public/admin.html`): entering a user name that contains
  "admin" (case-insensitive) redirects to the admin dashboard, which has
  tabs for Overview / Chat sessions / Users / Analytics (in Vietnamese).
- `POST /ai` — receives `{ "name", "message", "user_id", "conversation_id?" }`
  and returns the backend verdict plus conversation/message IDs.
- `/backend-api/*` — server-side proxy for user conversation and feedback APIs.
- `/admin-api/*` — server-side proxy for local admin stats, feedback review and
  fraud-pattern management; protect it with real admin authentication before deployment.
- In local fallback mode, every exchange is appended to `chat-logs.json`.
- `GET /chat-logs` — returns all recorded exchanges for the "Global Logs"
  view in the sidebar.

## Files

| File | Purpose |
|------|---------|
| `server.js` | Express server: static files, API proxy and local fallback |
| `public/chat.html` | Chat UI, local cache, backend history and feedback |
| `public/admin.html` | Admin dashboard (Overview / Sessions / Users / Analytics) |
| `chat-logs.json` | Created at runtime; stores recorded chat exchanges |

## Notes

- No login/authentication — the chat user's name is whatever they type.
- The `/chat-logs` endpoint and Global Logs view expose every user's chat
  content publicly. Protect it (e.g. require an admin key) before deploying
  to the public internet.
