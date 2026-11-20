# ADR-001: GraalVM component line for the Java 25 host

- **Status:** Provisional; not implemented
- **Date:** 2026-11-20

## Context

PolyglotMesh targets Java 25 and currently embeds the GraalVM Polyglot API and GraalJS Community runtime at 24.1.2. JavaScript execution is working. Python execution is not implemented. This decision records the compatibility evidence and the next investigation; it does not authorize or perform a dependency change.

## Current configuration

- Maven compiler target: Java 25 (`backend/pom.xml`, `java.version`).
- `org.graalvm.polyglot:polyglot:24.1.2` supplies the Polyglot API.
- `org.graalvm.polyglot:js-community:24.1.2` supplies the JavaScript guest runtime.
- The current host installation is Oracle JDK 25.0.1, not Oracle GraalVM or GraalVM Community Edition.
- The Python language artifact is not a project dependency, and Python execution is unavailable.

## Verified findings

1. GraalVM's JDK 23.0.2 release notes say that Truffle languages and other components at **24.1.2 are designed for GraalVM for JDK 23.0.2**. This is the official compatibility target for the current component line; the release notes do not establish Java 25 compatibility. [GraalVM for JDK 23 release notes](https://www.graalvm.org/release-notes/JDK_23/)
2. The project backend Maven verification passed on Oracle JDK 25.0.1 with the current JavaScript dependency. The existing JavaScript tests passed, showing project-tested execution on that host.
3. The test JVM reported that it used GraalVM's fallback runtime because JVMCI is not enabled. The guest code ran, but this is not evidence of GraalVM optimizing compilation or official 24.1.2 support on JDK 25.
4. Current GraalVM embedding documentation lists Oracle GraalVM 25 and GraalVM Community Edition 25 as supporting the optimizing runtime. It lists Oracle JDK 25 and OpenJDK 25 as supporting the optimizing runtime **only with polyglot isolates**, while the fallback runtime is supported. The current project uses classpath `js-community`, not an isolate artifact. [Runtime optimization support](https://www.graalvm.org/latest/reference-manual/embed-languages/)
5. GraalVM 25.0.0 documents compatibility with language components 25.0.0; later 25.x release notes similarly pair component and GraalVM versions. This provides a Java 25-aligned line to investigate, not a compatibility promise for an untested project migration. [GraalVM 25 release notes](https://www.graalvm.org/release-notes/JDK_25/), [GraalVM 25.5 release notes](https://www.graalvm.org/release-notes/25.5/)
6. Maven Central publishes `org.graalvm.polyglot:python:24.1.2` as a POM which brings in the matching `org.graalvm.python:python` runtime POM. The current GraalPy guide likewise documents the `org.graalvm.polyglot:python` POM alongside Polyglot. These coordinates describe artifact availability and dependency shape, not host-JDK compatibility. [Maven Central: GraalPy 24.1.2](https://central.sonatype.com/artifact/org.graalvm.polyglot/python/24.1.2), [GraalPy on the JVM](https://www.graalvm.org/jdk24/reference-manual/python/)
7. Maven Central marks the modern `org.graalvm.polyglot:js-community` coordinate deprecated in newer component lines in favor of `org.graalvm.polyglot:js`; the current `python` POM brings in GraalPy and Truffle Community Edition. A future migration should check artifact names and licensing for the exact selected release rather than mechanically reusing 24.1 coordinates. [Maven Central: GraalJS Community](https://central.sonatype.com/artifact/org.graalvm.polyglot/js-community), [Maven Central: GraalPy](https://central.sonatype.com/artifact/org.graalvm.polyglot/python)

## Compatibility assessment

| Question | Finding |
| --- | --- |
| Java target | Java 25, unchanged |
| Polyglot API 24.1.2 official target | GraalVM for JDK 23.0.2 component line |
| JavaScript 24.1.2 on this project host | Existing backend verification and JavaScript tests passed on Oracle JDK 25.0.1 |
| Optimizing runtime on this host | Not available through the current setup; tests report fallback due to JVMCI not enabled |
| Official support for current components on Oracle JDK 25 | Not established by the 24.1.2 release notes |
| GraalPy 24.1.2 on Java 25 | Not established or tested in this project |
| Python availability | Not installed in the project; no Python execution is supported |

## Options considered

1. **Keep 24.1.2 and Java 25 for now.** This preserves the working JavaScript setup and Java target. Its tested fallback behavior is known, while official compatibility and optimized runtime behavior on Java 25 remain unverified.
2. **Evaluate a coherent GraalVM 25 component line.** Start with a currently maintained 25.x patch release (25.5.5.0.3 is published on Maven Central as of this ADR date), aligning the Polyglot API, JavaScript runtime, and Python runtime. Check the modern artifact coordinates as part of that prototype. Test first on the current Oracle JDK 25 host and, separately, on GraalVM Community Edition or Oracle GraalVM 25 if optimized compilation is required. [Maven Central: Polyglot 25.5.5.0.3](https://central.sonatype.com/artifact/org.graalvm.polyglot/polyglot/25.5.5.0.3)
3. **Evaluate isolate artifacts on Oracle JDK 25.** Official embedding guidance lists isolates as the optimizing-runtime route for Oracle JDK 25/OpenJDK 25. This changes runtime architecture and deployment requirements, so it needs a separate prototype and security review; it is not selected for the current worker.

## Decision and recommendation

Keep the current dependencies unchanged for this milestone. Before adding Python, prototype a **single aligned GraalVM 25 component release** for Polyglot, GraalJS, and GraalPy while keeping the Java target at 25. Prefer a currently maintained 25.x patch release rather than assuming the initial 25.0.0 line is the best adoption target. First prove it on Oracle JDK 25.0.1 using the fallback runtime; if compilation performance is required, evaluate GraalVM CE/Oracle GraalVM 25 or the documented isolate approach as a separate choice.

This recommendation is provisional. Version alignment is evidence for the investigation path, not proof that a candidate release or GraalPy worker is compatible.

## Risks and tradeoffs

- Updating the Graal component line can affect JavaScript behavior, resources, startup, worker image size, and runtime compatibility.
- GraalPy adds substantial runtime resources; it may require language resources or a Maven plugin setup beyond the API JAR.
- Oracle JDK 25's fallback runtime passed tests but does not provide the same runtime compilation as an optimized GraalVM runtime.
- Isolate artifacts have additional platform and execution-mode requirements and would alter the runtime architecture.

## Required evidence before adoption

- Resolve and inspect the exact candidate POMs and transitive/runtime resources from Maven Central.
- Build and test with Java 25; run all backend tests and existing JavaScript API regressions.
- Confirm engine/compiler mode from runtime diagnostics rather than inferring it from passing tests.
- Build the Docker worker image and run real backend API tests for Python success, syntax/runtime errors, timeout, cleanup, and existing JavaScript behavior.
- Recheck every Docker security restriction and ensure the Python runtime does not require weakening them.
- Update documentation and capability reporting only after those checks pass.

## References

- [GraalVM for JDK 23 release notes](https://www.graalvm.org/release-notes/JDK_23/)
- [GraalVM for JDK 25 release notes](https://www.graalvm.org/release-notes/JDK_25/)
- [GraalVM 25.5 release notes](https://www.graalvm.org/release-notes/25.5/)
- [Embedding languages and runtime optimization support](https://www.graalvm.org/latest/reference-manual/embed-languages/)
- [GraalPy on the JVM](https://www.graalvm.org/jdk24/reference-manual/python/)
- [Maven Central: GraalJS Community 24.1.2](https://central.sonatype.com/artifact/org.graalvm.polyglot/js-community/24.1.2)
- [Maven Central: Polyglot 25.5.5.0.3](https://central.sonatype.com/artifact/org.graalvm.polyglot/polyglot/25.5.5.0.3)
- [Maven Central: GraalPy 24.1.2](https://central.sonatype.com/artifact/org.graalvm.polyglot/python/24.1.2)
- [Maven Central: GraalJS Community coordinate](https://central.sonatype.com/artifact/org.graalvm.polyglot/js-community)
