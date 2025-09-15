# Excalidraw App Backend

A minimal FastAPI backend used by the Excalidraw app for AI features.

## Setup

1. (Recommended) Create and activate a virtualenv
2. Install dependencies:

```
pip install -r requirements.txt
```

3. Set environment variables (example):

```
export OPEN_API_KEY=sk-...
export OPEN_API_BASE=https://api.openai.com/v1  # optional
export OPEN_API_MODEL=gpt-4o-mini               # optional
export HOST=127.0.0.1
export PORT=8787
```

4. Run the server:

```
uvicorn server:app --host ${HOST:-127.0.0.1} --port ${PORT:-8787}
```

## API

- POST /v1/ai/rect-text/generate

  - body: { "prompt": string }
  - returns: { "text": string }

- POST /v1/ai/text/generate
  - body: { "prompt": string, "currentText": string }
  - returns: { "text": string }

The server expects `OPEN_API_KEY` to be set in the environment.
