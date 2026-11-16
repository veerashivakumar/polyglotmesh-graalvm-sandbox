# Architecture and implementation status

## Current components

The backend is a Java 21 Spring Boot 3 WebFlux application. `HealthController` exposes the service health contract and `HealthResponse` represents its JSON body. The response reports `UP` while the application is serving requests; no external runtime, database, or other downstream component is currently part of the health criteria. `ApiExceptionHandler` returns a generic error payload without exposing exception messages. CORS is limited to the configured frontend origin, `GET`, and the API path.

The frontend is a React and TypeScript single-page dashboard. UI state is presentation only; `src/api/health.ts` owns the base URL, request timeout, HTTP handling, and response contract checks. The health indicator becomes connected only after a valid successful response. A 5 second timeout and network/HTTP errors report unavailable; malformed successful responses report unexpected.

## Configuration

| Variable | Application | Default | Purpose |
| --- | --- | --- | --- |
| `SERVER_PORT` | Backend | `8080` | HTTP listen port |
| `FRONTEND_ORIGIN` | Backend | `http://localhost:5173` | Single allowed browser origin for `/api/**` |
| `VITE_API_BASE_URL` | Frontend | `http://localhost:8080` | Backend origin used by the API client |

The frontend reads Vite variables at build time. Never place secrets in `VITE_*` variables because they are included in browser assets.

## Development flow

Run `mvn spring-boot:run` in `backend/`, then `npm ci` and `npm run dev` in `frontend/`. The Vite dev server serves the dashboard; the browser calls the backend directly, with CORS allowing the configured frontend origin. Run `mvn test` and `mvn package` for backend checks, and `npm test` and `npm run build` for frontend checks.

## Current limitations

No GraalVM/polyglot execution, authentication, persistence, rate limiting, editor, or sandbox isolation is implemented. The health endpoint confirms that the HTTP application can answer; it does not assert that a future execution engine is ready. The dashboard's language cards are informational. The global exception handler is a last-resort generic response; detailed server-side logging/observability is not configured yet.
