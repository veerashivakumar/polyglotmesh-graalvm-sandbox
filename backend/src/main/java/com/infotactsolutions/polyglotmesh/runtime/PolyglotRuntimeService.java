package com.infotactsolutions.polyglotmesh.runtime;

import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Engine;
import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.io.IOAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class PolyglotRuntimeService {
    private static final Logger log = LoggerFactory.getLogger(PolyglotRuntimeService.class);
    private static final Map<String, String> CANDIDATE_LANGUAGES = Map.of(
            "js", "JavaScript",
            "python", "Python",
            "ruby", "Ruby");

    private final Supplier<Engine> engineFactory;
    private Engine engine;
    private RuntimeCapabilities capabilities;

    public PolyglotRuntimeService() {
        this(() -> Engine.newBuilder().build());
    }

    PolyglotRuntimeService(Supplier<Engine> engineFactory) {
        this.engineFactory = engineFactory;
        initialize();
    }

    public synchronized RuntimeCapabilities capabilities() {
        return capabilities;
    }

    private void initialize() {
        try {
            engine = engineFactory.get();
            var installed = engine.getLanguages();
            var languages = CANDIDATE_LANGUAGES.entrySet().stream()
                    .map(entry -> inspectLanguage(entry.getKey(), entry.getValue(), installed.containsKey(entry.getKey())))
                    .toList();
            capabilities = new RuntimeCapabilities(
                    engine.getImplementationName(),
                    RuntimeCapabilities.RuntimeStatus.INITIALIZED,
                    engine.getVersion(),
                    System.getProperty("java.version", "unknown"),
                    languages,
                    null);
        } catch (Exception | LinkageError | InternalError exception) {
            log.warn("GraalVM Polyglot runtime initialization failed", exception);
            closeEngine();
            capabilities = new RuntimeCapabilities(
                    "GraalVM Polyglot",
                    RuntimeCapabilities.RuntimeStatus.UNAVAILABLE,
                    null,
                    System.getProperty("java.version", "unknown"),
                    CANDIDATE_LANGUAGES.entrySet().stream()
                            .map(entry -> new LanguageCapability(
                                    entry.getKey(), entry.getValue(), LanguageCapability.Status.NOT_CHECKED,
                                    "Runtime unavailable"))
                            .toList(),
                    "Runtime initialization failed; check server logs for details.");
        }
    }

    private LanguageCapability inspectLanguage(String id, String displayName, boolean installed) {
        if (!installed) {
            return new LanguageCapability(id, displayName, LanguageCapability.Status.NOT_INSTALLED,
                    "Language is not installed.");
        }
        try (Context context = Context.newBuilder(id)
                .engine(engine)
                .allowHostAccess(HostAccess.NONE)
                .allowHostClassLookup(className -> false)
                .allowIO(IOAccess.NONE)
                .allowCreateThread(false)
                .build()) {
            context.initialize(id);
            return new LanguageCapability(id, displayName, LanguageCapability.Status.AVAILABLE, null);
        } catch (Exception | LinkageError | InternalError exception) {
            log.warn("GraalVM guest language initialization failed for {}", id, exception);
            return new LanguageCapability(id, displayName, LanguageCapability.Status.INITIALIZATION_FAILED,
                    "Language initialization failed; check server logs for details.");
        }
    }

    @PreDestroy
    public synchronized void close() {
        closeEngine();
    }

    private void closeEngine() {
        if (engine != null) {
            try {
                engine.close();
            } catch (RuntimeException exception) {
                log.warn("GraalVM Polyglot engine shutdown failed", exception);
            } finally {
                engine = null;
            }
        }
    }
}
