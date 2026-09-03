# AI Chat Web

A simple browser-based AI chat application. Users type messages, the server
returns a reply (currently a stub), and every exchange is saved to a JSON log
file.

## Run locally

```bash
npm install     # only the first time
npm start       # runs `node server.js`
```

Open http://localhost:3000 in a browser.

## What it does

- Landing page is the AI chat UI (`public/chat.html`).
- Admin page (`public/admin.html`): entering a user name that contains
  "admin" (case-insensitive) redirects to the admin dashboard, which has
  tabs for Overview / Chat sessions / Users / Analytics (in Vietnamese).
- `POST /ai` — receives `{ "name", "message" }` and returns `{ "reply" }`.
  The reply is a placeholder; replace the stub in `server.js` with a real AI
  backend.
- Every exchange is appended to `chat-logs.json` (gitignored).
- `GET /chat-logs` — returns all recorded exchanges for the "Global Logs"
  view in the sidebar.

## Files

| File | Purpose |
|------|---------|
| `server.js` | Express server: static files, `/ai`, `/chat-logs`, chat logging |
| `public/chat.html` | The chat UI (sidebar, conversations, Global Logs view) |
| `public/admin.html` | Admin dashboard (Overview / Sessions / Users / Analytics) |
| `chat-logs.json` | Created at runtime; stores recorded chat exchanges |

## Notes

- No login/authentication — the chat user's name is whatever they type.
- The `/chat-logs` endpoint and Global Logs view expose every user's chat
  content publicly. Protect it (e.g. require an admin key) before deploying
  to the public internet.
