# Backend setup for AI features

This app now expects a backend under `excalidraw-app/backend` that provides AI endpoints.

## 1) Run the backend (FastAPI)

```
cd excalidraw-app/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# set your API key(s)
export OPEN_API_KEY=sk-...
# optional overrides
export OPEN_API_BASE=https://api.openai.com/v1
export OPEN_API_MODEL=gpt-4o-mini

# CORS (optional): comma-separated list
export CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# run server
uvicorn server:app --host 127.0.0.1 --port 8787
```

Health check: `GET http://127.0.0.1:8787/health` should return `{ ok: true }`.

## 2) Wire frontend to backend

Set the frontend env variable so the app can call the backend:

```
# in your shell before starting the dev server
export VITE_APP_AI_BACKEND=http://127.0.0.1:8787
```

Then start the frontend dev server as you normally do.

## 3) Usage

- Select a rectangle. A small toolbar appears with an input box.
- Type your prompt and press "Send".
- The backend will return generated text which is inserted into the rectangle (creating a text if none bound exists).
