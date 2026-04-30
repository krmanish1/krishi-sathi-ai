# Backend streaming header for AI SDK (`useChat`)

The Expo app uses `@ai-sdk/react` `useChat`, which parses **UIMessageStream v1** SSE responses only when this header is present on `POST /api/v1/query/stream`:

```http
x-vercel-ai-ui-message-stream: v1
```

Add it to your `StreamingResponse` in FastAPI:

```python
return StreamingResponse(
    event_stream(),
    media_type="text/event-stream",
    headers={
        "x-vercel-ai-ui-message-stream": "v1",
        "Cache-Control": "no-cache",
    },
)
```

Your existing SSE frames (`start`, `data-stage`, `text-*`, `finish`, `[DONE]`) already match the protocol.
