package com.infotactsolutions.polyglotmesh.execution;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.PolyglotAccess;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.ResourceLimits;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.io.IOAccess;
import com.infotactsolutions.polyglotmesh.runtime.LanguageCapability;
import com.infotactsolutions.polyglotmesh.runtime.PolyglotRuntimeService;
import com.infotactsolutions.polyglotmesh.runtime.RuntimeCapabilities;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ExecutionService implements AutoCloseable {
    static final int MAX_SOURCE_CHARS = 20_000;
    static final int MAX_OUTPUT_BYTES = 16_384;
    static final long MAX_STATEMENTS = 1_000_000;
    static final long TIMEOUT_MS = 2_000;
    private final ScheduledExecutorService canceller = Executors.newScheduledThreadPool(4, r -> {
        Thread thread = new Thread(r, "polyglot-execution-canceller");
        thread.setDaemon(true);
        return thread;
    });
    private final PolyglotRuntimeService runtimeService;

    public ExecutionService(PolyglotRuntimeService runtimeService) { this.runtimeService = runtimeService; }

    public ExecutionResponse execute(String language, String code) {
        if (!"javascript".equals(language) && !"js".equals(language)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JavaScript execution is supported.");
        }
        boolean available = runtimeService.capabilities().status() == RuntimeCapabilities.RuntimeStatus.INITIALIZED
                && runtimeService.capabilities().languages().stream().anyMatch(item -> item.id().equals("js") && item.status() == LanguageCapability.Status.AVAILABLE);
        if (!available) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "JavaScript runtime is unavailable.");
        if (code == null || code.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Code must not be blank.");
        if (code.length() > MAX_SOURCE_CHARS) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Code exceeds the 20000 character limit.");

        long started = System.nanoTime();
        var stdout = new BoundedOutputStream(MAX_OUTPUT_BYTES);
        var timedOut = new AtomicBoolean();
        Context context = Context.newBuilder("js")
                .allowHostAccess(HostAccess.NONE)
                .allowHostClassLookup(name -> false)
                .allowIO(IOAccess.NONE)
                .allowEnvironmentAccess(org.graalvm.polyglot.EnvironmentAccess.NONE)
                .allowNativeAccess(false)
                .allowCreateThread(false)
                .allowCreateProcess(false)
                .allowPolyglotAccess(PolyglotAccess.NONE)
                .allowValueSharing(false)
                .out(stdout).err(stdout)
                .option("engine.WarnInterpreterOnly", "false")
                .resourceLimits(ResourceLimits.newBuilder().statementLimit(MAX_STATEMENTS, source -> true).build())
                .build();
        var timeout = canceller.schedule(() -> {
            timedOut.set(true);
            try { context.close(true); } catch (RuntimeException ignored) { }
        }, TIMEOUT_MS, TimeUnit.MILLISECONDS);
        ExecutionResponse.Status status;
        String error = null;
        try {
            Value result = context.eval("js", code);
            if (result != null && !result.isNull()) {
                String value = result.toString();
                String captured = stdout.text();
                stdout.append((captured.isEmpty() || captured.endsWith("\n") ? "" : "\n") + value);
            }
            status = ExecutionResponse.Status.SUCCESS;
        } catch (PolyglotException exception) {
            error = timedOut.get() ? "Execution exceeded the 2000 ms time limit."
                    : exception.isSyntaxError() ? "JavaScript syntax error: " + safeMessage(exception)
                    : exception.isResourceExhausted() ? "Execution exceeded the statement limit."
                    : "JavaScript execution failed: " + safeMessage(exception);
            status = ExecutionResponse.Status.ERROR;
        } finally {
            timeout.cancel(false);
            try { context.close(true); } catch (RuntimeException ignored) { }
        }
        return new ExecutionResponse(UUID.randomUUID().toString(), "javascript", status, stdout.text(), error, elapsedMs(started));
    }

    private static long elapsedMs(long start) { return Duration.ofNanos(System.nanoTime() - start).toMillis(); }
    private static String safeMessage(PolyglotException exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) return "Guest script failed.";
        return message.length() > 300 ? message.substring(0, 300) : message;
    }
    @Override public void close() { canceller.shutdownNow(); }
}
