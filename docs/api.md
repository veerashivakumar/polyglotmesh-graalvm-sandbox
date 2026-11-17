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

`timestamp` is generated per request as an ISO-8601 UTC instant. The endpoint checks application reachability only. Unexpected server errors use HTTP `500` and a generic JSON body; internal exception messages are not returned.

## `GET /api/runtime/capabilities`

Returns HTTP `200` with the most recently initialized runtime capability snapshot. A successful request can report `status: UNAVAILABLE`; that means the capability check worked but runtime initialization did not. Guest languages are reported individually as `AVAILABLE`, `NOT_INSTALLED`, `INITIALIZATION_FAILED`, or `NOT_CHECKED` when the engine could not start.

```json
{
  "runtimeName": "Interpreted",
  "status": "INITIALIZED",
  "runtimeVersion": "Development Build",
  "hostJavaVersion": "21.0.8",
  "languages": [
    { "id": "js", "displayName": "JavaScript", "status": "AVAILABLE", "diagnostic": null },
    { "id": "python", "displayName": "Python", "status": "NOT_INSTALLED", "diagnostic": "Language is not installed." },
    { "id": "ruby", "displayName": "Ruby", "status": "NOT_INSTALLED", "diagnostic": "Language is not installed." }
  ],
  "diagnostic": null
}
```

The runtime name and version, Java version, and language statuses come from the running engine and JVM. If runtime initialization fails, the endpoint remains available and returns `status: UNAVAILABLE` with a generic diagnostic; detailed exceptions are logged server-side. This API does not execute guest code.
