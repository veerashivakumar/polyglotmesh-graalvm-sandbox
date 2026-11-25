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

The runtime name and version, Java version, and language statuses come from the running engine and JVM. If runtime initialization fails, the endpoint remains available and returns `status: UNAVAILABLE` with a generic diagnostic; detailed exceptions are logged server-side.

## `POST /api/executions`

Executes JavaScript in a one-shot Docker worker by default. The only accepted language identifiers are `javascript` and `js`. Other languages and blank source receive HTTP `400`. Source longer than 20,000 characters receives HTTP `413`. Request bodies are bounded by the WebFlux codec at 64 KiB. Docker/worker unavailability returns HTTP `503`; worker startup failures return `502`; a worker exceeding the 20-second wall-clock deadline returns `504`. The backend never switches to in-process execution after these failures. Set `EXECUTION_PROVIDER=in-process` explicitly to use the development-only embedded provider.

Request:

```json
{ "language": "javascript", "code": "const price = 100; console.log(price * 2);" }
```

Successful guest evaluation returns HTTP `200`:

```json
{
  "executionId": "generated-uuid",
  "language": "javascript",
  "status": "SUCCESS",
  "output": "200",
  "error": null,
  "executionTimeMs": 18
}
```

Guest syntax and runtime errors return HTTP `200` with `status: ERROR`, captured output, and a short guest error message. Infrastructure and request errors use HTTP error statuses. The elapsed time includes context construction, guest execution, and cleanup; it is not a measure of guest computation alone.

In Docker mode, the response is serialized through worker stdin/stdout and retains the Day 4 response fields. The worker image and configured Docker restrictions are described in `docs/architecture.md`; this repository's current environment could not verify a daemon or run the image.

The Studio results inspector displays the response's status, captured output, guest error, language, elapsed time, and execution ID. It distinguishes guest errors from HTTP infrastructure failures and maps worker unavailability, worker startup failure, runtime unavailability, timeout, network failure, and unexpected response shapes to separate user-facing states. Server error bodies are not shown verbatim. Output can be copied when present, and clearing the current result leaves the session's execution history intact. No additional response metadata is currently defined by this API.
