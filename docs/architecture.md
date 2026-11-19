# Architecture and implementation status

## Components

The backend is a Java 25 Spring Boot 3 WebFlux application. `HealthController` exposes HTTP application health. `PolyglotRuntimeService` owns one GraalVM Polyglot `Engine`, initializes candidate guest languages in short lived restricted `Context`s, and closes the engine during Spring shutdown. `RuntimeCapabilitiesController` exposes the detected runtime state. `ExecutionController` sends blocking execution work to Reactor's bounded elastic scheduler. `ExecutionService` validates the request and delegates to `ExecutionProvider`. Health is separate from runtime capability: `/api/health` reports whether the HTTP app can answer, while `/api/runtime/capabilities` reports whether the polyglot engine and guest languages initialized.

## Execution process boundary

Docker is the default provider (`EXECUTION_PROVIDER=docker`). Each request starts one short-lived `polyglotmesh-js-worker:day5` container via a fixed `ProcessBuilder` argument list. The only guest input is a bounded JSON object on stdin; the worker emits one structured JSON result on stdout. The backend enforces a 20-second wall-clock deadline, kills timed-out containers, and uses Docker `--rm` cleanup plus forced removal on timeout. Worker/daemon failures become HTTP 503 or 502; there is no in-process fallback. `EXECUTION_PROVIDER=in-process` explicitly enables the former context-based implementation for local development only.

The worker image recipe is `backend/Dockerfile.worker`. From the repository root, prepare its classpath and build it with `cd backend; mvn dependency:copy-dependencies; cd ..; docker build -f backend/Dockerfile.worker -t polyglotmesh-js-worker:day5 .`. The container command applies `--network=none`, `--read-only`, all capabilities dropped, `no-new-privileges`, 128 MiB memory, 0.5 CPU, 32 processes, UID/GID 65534, a 16 MiB noexec/nosuid tmpfs at `/tmp`, and no host mounts or Docker socket. A separate 32 MiB executable tmpfs at `/graal-cache`, owned by UID/GID 65534, stores GraalVM runtime resources; the image entry point explicitly sets `polyglot.engine.userResourceCache` to that location. Both tmpfs mounts disappear with the one-shot container. No application secrets are forwarded. The worker additionally denies Polyglot host access, IO, environment, native access, process creation, and threads; caps source at 20,000 characters, output at 16 KiB, and statements at one million.

The Day 5 worker image and real backend-to-worker path were verified on Docker Desktop 29.8.2 with its WSL2 engine. Runtime probes confirmed UID 65534, a read-only root, no network interface beyond loopback, zero effective capabilities, `NoNewPrivs=1`, 128 MiB memory, 0.5 CPU, 32 processes, the noexec `/tmp`, writable UID-owned executable cache tmpfs, no host mounts or Docker socket, and container removal. These results describe this tested Docker Desktop setup; another daemon/runtime still needs its own verification. This prototype does not provide seccomp/AppArmor customization, request authentication, rate limiting, or durable job management. The GraalVM Context is a language-level restriction; only the separate container/JVM provides an OS process boundary.

The Polyglot API is the Java API used to discover engines and create guest-language contexts. An `Engine` shares runtime infrastructure and language installations; a `Context` is the isolated environment in which a language is initialized or code can execute. Execution contexts are not shared between requests. Host access, host class lookup, filesystem and socket IO, environment access, native access, process creation, guest threads, and polyglot access are disabled. Context output and error streams are captured in a bounded buffer. This configuration reduces access to host resources but is not a production security boundary for hostile code; stronger guarantees require process or container isolation.

The frontend is a React and TypeScript dashboard. Its centralized API clients own the backend URL, timeout handling, HTTP handling, and response contract checks. The dashboard renders HTTP connection state separately from runtime state and uses live language statuses. Studio Canvas submits JavaScript to the execution API and renders returned output, errors, and measured elapsed time. Python and Ruby remain unavailable.

## GraalVM and languages

The configured toolchain is JDK 25, not a GraalVM distribution. Maven uses `JAVA_HOME`, which must point to a JDK 25 installation. Polyglot API 24.1.2 and the Community JavaScript engine are Maven dependencies; the embedded JS runtime runs on the configured standard JDK. No GraalVM distribution or `gu` installer was detected. The live API check reported engine implementation `Interpreted` and engine version `Development Build`; these are the values returned by the embedded engine on this HotSpot setup, not a GraalVM distribution release number.

Only JavaScript is included in the build. Python and Ruby are candidates reported as not installed because their implementations are not included. If the whole engine fails to initialize, candidate languages are `NOT_CHECKED`; they are never mislabeled as not installed without inspecting a working engine. They are not supported until compatible runtime artifacts and any language-specific resources are added and verified. Adding the Polyglot API by itself does not install languages.

## Configuration

| Variable | Application | Default | Purpose |
| --- | --- | --- | --- |
| `SERVER_PORT` | Backend | `8080` | HTTP listen port |
| `FRONTEND_ORIGIN` | Backend | `http://localhost:5173` | Single allowed browser origin for `/api/**` |
| `VITE_API_BASE_URL` | Frontend | `http://localhost:8080` | Backend origin used by the API client |

The frontend reads Vite variables at build time. Never place secrets in `VITE_*` variables because they are included in browser assets.

## Development and checks

Run `mvn spring-boot:run` in `backend/`, then `npm ci` and `npm run dev` in `frontend/`. Run `mvn test` and `mvn package` for backend checks, and `npm test` and `npm run build` for frontend checks. Maven tests use `target/graal-cache` for GraalVM internal resources. At runtime, GraalVM uses its per-user resource cache by default; when the home directory is read-only, set `-Dpolyglot.engine.userResourceCache=<writable-path>` on the application JVM.

## Limitations

Execution enforces a 20,000 character source limit, a 64 KiB request-body codec limit, a 16 KiB captured output limit, a one-million statement limit per context, and (in Docker mode) a 20-second bounded container deadline. In-process development mode has a best-effort two-second context cancellation and does not supply a process boundary or hard memory quota. Context creation and cleanup are included in the reported duration. Only JavaScript is executable; Python and Ruby remain unavailable.
