# PolyglotMesh

PolyglotMesh is a developer-focused sandbox concept for exploring a multi-language runtime. This repository currently provides the application foundation and a live backend health check. Language execution, GraalVM integration, Monaco Editor, and Docker support are not implemented yet.

## Architecture

- `backend/` is a Java 21 Spring Boot WebFlux service. It owns the `/api/health` endpoint and controls allowed browser origins through `FRONTEND_ORIGIN`.
- `frontend/` is a React and TypeScript dashboard. Its API client owns backend URL configuration, timeout handling, and health response validation. UI components render the resulting connection state.
- `docs/` contains the architecture and API contract.

See [docs/architecture.md](docs/architecture.md) for details and current limitations.

## Requirements

- JDK 21
- Maven 3.9+
- Node.js 20.19+ and npm

## Local development

Backend, from `backend/`:

```sh
mvn spring-boot:run
```

The backend listens on port 8080 by default. Set `SERVER_PORT` to change it. Set `FRONTEND_ORIGIN` if the browser app is served from a different origin (default `http://localhost:5173`).

Frontend, from `frontend/`:

```sh
npm ci
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_API_BASE_URL` if the backend is not at `http://localhost:8080`. The frontend dev server runs on port 5173 by default.

## API

`GET /api/health` returns JSON with `service`, `status`, and an ISO-8601 UTC `timestamp`. See [docs/api.md](docs/api.md).

## Checks

Backend tests and package:

```sh
cd backend
mvn test
mvn package
```

Frontend tests and production build:

```sh
cd frontend
npm test
npm run build
```

The backend has no database dependency. There is no language execution API yet; the language cards are informational and do not claim to execute code.
