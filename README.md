# PolyglotMesh

PolyglotMesh is a sandbox foundation for exploring a multi-language runtime. The backend embeds GraalVM Polyglot, reports runtime capabilities, and defaults to one-shot Docker worker execution for JavaScript. Python and Ruby execution and Monaco Editor are not implemented.

## Architecture

- `backend/` is a Java 25 Spring Boot WebFlux service with health, runtime capability, and JavaScript execution APIs.
- `frontend/` is a React and TypeScript dashboard with Studio Canvas, centralized API clients, and an execution results inspector with output/error details, metadata, copy, and clear actions.
- `docs/` contains the architecture and API contract.

## Requirements

- JDK 25 and Maven 3.9+
- Node.js 20.19+ and npm
- GraalVM installation is not required for the embedded JavaScript Community engine; Maven resolves its runtime artifacts.

## Local development

In a PowerShell terminal at the repository root, dot-source `scripts/setup-polyglotmesh-env.ps1` before running Maven. This configures Java 25 and the project-specific Maven cache for the current terminal only, checks that the cache is writable, and confirms Maven uses it. For each new terminal, run:

```powershell
. .\scripts\setup-polyglotmesh-env.ps1
java -version
javac -version
mvn.cmd -version
```

If PowerShell blocks the local script under the current execution policy, allow scripts for that process only and then dot-source it:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\scripts\setup-polyglotmesh-env.ps1
```

Then, from `backend/`, run `mvn.cmd spring-boot:run`. Maven uses `C:\Users\veera\.m2\repository-polyglotmesh`; the script does not permanently change Windows environment variables or Maven settings. The service listens on port 8080. Set `SERVER_PORT` to change it and `FRONTEND_ORIGIN` to change the allowed browser origin (default `http://localhost:5173`).

From `frontend/`, run `npm ci` and `npm run dev`. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` if the backend is not at `http://localhost:8080`.

## API

`GET /api/health` checks HTTP application reachability. `GET /api/runtime/capabilities` reports runtime initialization and detected guest languages. See [docs/api.md](docs/api.md).

## Checks

In `backend/`, run `mvn test` and `mvn package`. In `frontend/`, run `npm test` and `npm run build`.

The current Java 25 and GraalVM 24.1.2 compatibility findings, including the provisional recommendation for future Python work, are recorded in [ADR-001](docs/decisions/ADR-001-graalvm-java25-compatibility.md). Dependencies remain unchanged pending a tested compatibility decision.

Runtime capability detection remains separate from execution. Only JavaScript is currently executable; Python and Ruby are reported as unavailable until their implementations are installed and initialized.

Docker execution requires a running Docker daemon and the `polyglotmesh-js-worker:day5` image. See [docs/architecture.md](docs/architecture.md) for the worker build command, restrictions, and verification limits. Set `EXECUTION_PROVIDER=in-process` only for explicit local development; this mode has no OS process isolation.
