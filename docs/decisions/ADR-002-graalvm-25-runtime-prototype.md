# ADR-002: GraalVM 25.1 runtime compatibility prototype

- **Status:** Experimental; production dependencies and APIs unchanged
- **Date:** 2026-11-23

## Context

PolyglotMesh production currently uses Java 25 with Polyglot API and GraalJS Community 24.1.2. Day 5 JavaScript execution runs in a one-shot Docker worker with OS-level restrictions. Python is not integrated into the execution API. Day 6 ADR-001 recommended a separate aligned GraalVM 25 component experiment.

The experiment lives under `backend/prototypes/graalvm-25.1/`. It is not part of the backend Maven build, production dependency graph, Docker image, or execution API.

## Selected experimental dependency set

The prototype pins one component release line:

| Artifact | Version | Scope |
| --- | --- | --- |
| `org.graalvm.polyglot:polyglot` | 25.1.3 | API |
| `org.graalvm.polyglot:js-community` | 25.1.3 | JavaScript runtime POM |
| `org.graalvm.polyglot:python-community` | 25.1.3 | GraalPy runtime POM |

GraalVM 25.1.3 release notes identify GraalVM Community Edition 25.1.3 and Oracle GraalVM 25.1.3, both based on JDK 25.0.3, and state that this release is compatible with Graal Languages and components 25.1.3. Maven resolved the prototype's selected artifacts and transitive runtime resources, including `python-resources` 25.1.3.

The Community suffixed language POMs were selected to match the existing community runtime line. The POM descriptions mark these legacy coordinates deprecated in favor of `org.graalvm.polyglot:js` and `org.graalvm.polyglot:python`. This experiment preserves line alignment and licensing intent; a future adoption should evaluate the replacement coordinates and their terms explicitly.

Version 25.1.3 is selected to test the specifically requested 25.1 feature line, not because it is the newest 25.x release. The release calendar lists 25.5.5.0.3 as the latest released feature line on this ADR date; adoption work must repeat the checks on the then-current line.

Compared with production's 24.1.2 setup, the Polyglot `Context` embedding pattern and the tested JavaScript expressions remain usable, but the experiment adds a separately versioned GraalPy runtime and its Python resources, uses the 25.1.3 component line, and exposes fallback-runtime warnings on the current host. Java 25's optimizing path introduces platform-specific isolate artifacts and an isolate-enabled engine configuration. This prototype does not exercise that path, so it does not establish runtime-compilation performance or isolate compatibility.

## Compatibility evidence

**Officially documented:**

- The GraalVM 25.1.3 release/component compatibility pair is 25.1.3 with 25.1.3. This is a distribution/component compatibility statement; it is not a blanket support statement for every Java 25 vendor build.
- GraalVM embedding documentation says that an optimizing runtime on Oracle JDK 25/OpenJDK 25 requires polyglot isolates. The standard classpath runtime used here does not provide that mode on this host. Community polyglot isolates are available starting with GraalVM 25.1 and use `*-isolate-community` artifacts; they are a separate architecture and were not included in this experiment.
- GraalPy is embeddable through the Polyglot API. Its 25.1.3 runtime POM resolves GraalPy runtime resources; artifact availability alone does not prove a complete application integration.

**Experimentally verified:**

- On Oracle JDK 25.0.1 (Windows amd64), the aligned 25.1.3 artifacts initialized and executed JavaScript and a controlled GraalPy script in fresh contexts.
- Prototype tests also verified syntax/runtime error conversion, output bounds, reset context state, denied Java host access, and denied Python filesystem IO.
- The test runtime reported a fallback runtime because JVMCI was disabled. It did not perform optimizing runtime compilation. The host JDK is 25.0.1, while the documented GraalVM 25.1.3 distributions are based on JDK 25.0.3, so this run is experimental evidence only.

**Observed warnings and limits:**

- GraalVM reported `JVMCI is not enabled` and used its fallback runtime. The prototype captures this diagnostic separately from guest output and does not suppress it.
- JDK 25 emitted a restricted `System.load` native-access warning and a terminal deprecation warning for `sun.misc.Unsafe` use by Truffle. The prototype does not enable unrestricted native access to quiet these warnings.
- GraalVM's documentation describes isolates as the runtime-compilation route for standard Oracle/OpenJDK 25 hosts. Neither the Oracle isolate artifacts nor the Community `*-isolate-community` artifacts were tried; no isolate behavior is claimed here.

## Prototype architecture

`RuntimeCompatibilityPrototype` opens and closes a new context per evaluation. It limits allowed languages to JavaScript and Python, denies host access/class lookup, IO, environment access, native access, process creation, threads, and polyglot access, bounds source and output, and applies a statement limit. The Python worker accepts a data-only string of at most 256 characters and passes it as a binding to a fixed script; input is not interpolated into source code. Guest output and runtime diagnostics are kept separate.

These are Polyglot context restrictions for a feasibility prototype. They are not an OS security boundary. The existing Docker worker remains the only configured process/container boundary and remains JavaScript-only.

## Verification results

| Check | Result |
| --- | --- |
| Existing backend baseline (`mvn test package`, Java 25.0.1) | Passed: 14 tests; package succeeded |
| 25.1.3 prototype (`mvn test package`, Java 25.0.1) | Passed: 7 tests; package succeeded |
| JavaScript prototype | Passed: evaluates `21 * 2` to `42`; host access denied; fresh state verified |
| GraalPy prototype | Passed: controlled `PolyglotMesh` input prints `hello PolyglotMesh`; syntax/runtime and filesystem failures handled |
| Frontend tests | Passed: 13 tests across 4 files |
| TypeScript and frontend production build | Passed: `npm run build` |
| Docker worker/image/security checks | Not run: Docker CLI is installed, but the Docker Engine named pipe is unavailable |
| Day 5 worker regression | Not run against Docker; existing production backend regression tests passed |

No Docker test is reported as passed. The Docker security flags and worker restrictions were inspected in source and were not changed, but their runtime behavior was not revalidated in this environment.

## Decision

Keep the production dependency line at 24.1.2 and leave the Docker worker/API unchanged. Retain this separate 25.1.3 prototype as evidence that JavaScript and controlled GraalPy execution can initialize on the current Java 25.0.1 host using the fallback runtime. Do not describe Python as production-integrated or this classpath prototype as an OS sandbox.

## Risks and next steps

- Verify the prototype on a matching GraalVM Community Edition 25.1.3 or Oracle GraalVM 25.1.3 distribution, based on JDK 25.0.3, and compare runtime mode and startup behavior.
- Repeat dependency and behavior checks on the newer 25.5.5.0.3 component line before any adoption decision.
- Evaluate `js-isolate-community` and `python-isolate-community` with the platform-specific native components before considering isolates in the existing Linux Docker worker.
- With Docker available, build a separately tagged experimental worker and test JavaScript regression, Python success/errors, network/filesystem/process denial, container cleanup, and all existing resource/security flags. Do not weaken the Day 5 controls.
- Assess Python resource/image size, worker startup and memory, request protocol, timeouts, and language capability reporting before proposing production integration.
- Review migration from deprecated Community artifact names and confirm licensing for the exact replacement artifacts before adoption.

## References

- [GraalVM 25.1.3 release notes](https://www.graalvm.org/release-notes/25.1/)
- [GraalVM release calendar](https://www.graalvm.org/release-calendar/)
- [GraalVM 25 embedding and runtime compilation guidance](https://www.graalvm.org/jdk25/reference-manual/embed-languages/)
- [Maven Central: Polyglot API 25.1.3](https://central.sonatype.com/artifact/org.graalvm.polyglot/polyglot/25.1.3)
- [Maven Central: GraalPy Community 25.1.3](https://central.sonatype.com/artifact/org.graalvm.polyglot/python-community/25.1.3)
- [Maven Central: GraalJS Community coordinate](https://central.sonatype.com/artifact/org.graalvm.polyglot/js-community)
- [Day 6 ADR-001](ADR-001-graalvm-java25-compatibility.md)
