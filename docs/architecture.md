# Architecture and implementation status

## Components

The backend is a Java 21 Spring Boot 3 WebFlux application. `HealthController` exposes HTTP application health. `PolyglotRuntimeService` owns one GraalVM Polyglot `Engine`, initializes candidate guest languages in short lived restricted `Context`s, and closes the engine during Spring shutdown. `RuntimeCapabilitiesController` exposes the detected runtime state. Health is separate from runtime capability: `/api/health` reports whether the HTTP app can answer, while `/api/runtime/capabilities` reports whether the polyglot engine and guest languages initialized.

The Polyglot API is the Java API used to discover engines and create guest-language contexts. An `Engine` shares runtime infrastructure and language installations; a `Context` is the isolated environment in which a language is initialized or code can execute. This stage creates contexts only for initialization checks. It does not expose guest-code execution, host objects, host class lookup, filesystem IO, network IO, or guest-created threads.

The frontend is a React and TypeScript dashboard. Its centralized API client owns the backend URL, timeout handling, HTTP handling, and response contract checks. The dashboard renders HTTP connection state separately from runtime state and uses live language statuses.

## GraalVM and languages

The configured toolchain is Eclipse Temurin JDK 21.0.8, not a GraalVM distribution. The interactive `java` command can resolve to Oracle JDK 25, but Maven uses `JAVA_HOME` (Temurin 21). Polyglot API 24.1.2 and the Community JavaScript engine are Maven dependencies; the embedded JS runtime runs on the configured standard JDK. No GraalVM distribution or `gu` installer was detected. The live API check reported engine implementation `Interpreted` and engine version `Development Build`; these are the values returned by the embedded engine on this HotSpot setup, not a GraalVM distribution release number.

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

No guest-code execution, authentication, persistence, rate limiting, editor, or complete execution sandbox is implemented. Capability checks confirm that installed language implementations can initialize; they do not establish that untrusted guest code is safe to execute. API diagnostics are generic while detailed initialization errors go to server logs. Python and Ruby runtime setup remains unconfigured.
