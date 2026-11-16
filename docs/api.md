# API contract

## `GET /api/health`

Returns HTTP `200` and `application/json` when the backend is serving requests.

```json
{
  "service": "PolyglotMesh",
  "status": "UP",
  "timestamp": "2026-11-16T12:00:00Z"
}
```

`timestamp` is generated per request as an ISO-8601 UTC instant. This endpoint currently checks application reachability only; there are no downstream dependencies to include in its health decision.

Unexpected server errors use HTTP `500` and a generic JSON body containing `status`, `error`, and `timestamp`. Internal exception messages are not returned to callers.
