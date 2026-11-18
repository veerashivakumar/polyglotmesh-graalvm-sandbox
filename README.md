# PolyglotMesh

PolyglotMesh is an enterprise-oriented sandbox foundation for exploring a multi-language runtime. The backend embeds GraalVM Polyglot, reports runtime capabilities, and provides controlled JavaScript execution. Python and Ruby execution, Monaco Editor, and Docker support are not implemented.

## Architecture

- `backend/` is a Java 25 Spring Boot WebFlux service with health, runtime capability, and JavaScript execution APIs.
- `frontend/` is a React and TypeScript dashboard with Studio Canvas and centralized API clients.
- `docs/` contains the architecture and API contract.

## Requirements

- JDK 25 and Maven 3.9+
- Node.js 20.19+ and npm
- GraalVM installation is not required for the embedded JavaScript Community engine; Maven resolves its runtime artifacts.

## Local development

From `backend/`, run `mvn spring-boot:run`. The service listens on port 8080. Set `SERVER_PORT` to change it and `FRONTEND_ORIGIN` to change the allowed browser origin (default `http://localhost:5173`).

From `frontend/`, run `npm ci` and `npm run dev`. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` if the backend is not at `http://localhost:8080`.

## API

`GET /api/health` checks HTTP application reachability. `GET /api/runtime/capabilities` reports runtime initialization and detected guest languages. See [docs/api.md](docs/api.md).

## Checks

In `backend/`, run `mvn test` and `mvn package`. In `frontend/`, run `npm test` and `npm run build`.

Runtime capability detection remains separate from execution. Only JavaScript is currently executable; Python and Ruby are reported as unavailable until their implementations are installed and initialized.
