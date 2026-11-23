package com.infotactsolutions.polyglotmesh.prototype;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.EnvironmentAccess;
import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.PolyglotAccess;
import org.graalvm.polyglot.ResourceLimits;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.io.IOAccess;

/** Isolated compatibility experiment; this is not wired into the production API. */
public final class RuntimeCompatibilityPrototype {
    private static final int MAX_SOURCE_CHARS = 20_000;
    private static final int MAX_OUTPUT_BYTES = 16_384;
    private static final Set<String> LANGUAGES = Set.of("js", "python");
    private static final String PYTHON_WORKER_SCRIPT = "print('hello ' + request_value)";

    public Evaluation executeJavascript(String source) {
        return evaluate("js", source, null);
    }

    /** Runs fixed Python code with a bounded, data-only input binding. */
    public Evaluation executePython(String input) {
        if (input == null || input.length() > 256 || input.indexOf('\0') >= 0) {
            return new Evaluation(Status.ERROR, "", "Input must be at most 256 characters and contain no NUL.", "");
        }
        return evaluate("python", PYTHON_WORKER_SCRIPT, input);
    }

    Evaluation evaluatePythonSource(String source) {
        return evaluate("python", source, null);
    }

    private Evaluation evaluate(String language, String source, String requestValue) {
        if (!LANGUAGES.contains(language)) {
            return new Evaluation(Status.ERROR, "", "Unsupported prototype language.", "");
        }
        if (source == null || source.isBlank() || source.length() > MAX_SOURCE_CHARS) {
            return new Evaluation(Status.ERROR, "", "Source must be non-blank and at most 20,000 characters.", "");
        }

        var output = new BoundedOutputStream(MAX_OUTPUT_BYTES);
        var diagnostics = new BoundedOutputStream(MAX_OUTPUT_BYTES);
        try (Context context = Context.newBuilder(language)
                .allowHostAccess(HostAccess.NONE)
                .allowHostClassLookup(name -> false)
                .allowIO(IOAccess.NONE)
                .allowEnvironmentAccess(EnvironmentAccess.NONE)
                .allowNativeAccess(false)
                .allowCreateThread(false)
                .allowCreateProcess(false)
                .allowPolyglotAccess(PolyglotAccess.NONE)
                .allowValueSharing(false)
                .out(output)
                .err(diagnostics)
                .resourceLimits(ResourceLimits.newBuilder().statementLimit(1_000_000, ignored -> true).build())
                .build()) {
            if (requestValue != null) {
                context.getBindings(language).putMember("request_value", requestValue);
            }
            Value value = context.eval(language, source);
            if (language.equals("js") && value != null && !value.isNull()) {
                output.append((output.size() == 0 ? "" : "\n") + value);
            }
            return new Evaluation(Status.SUCCESS, output.toString(), null, diagnostics.toString());
        } catch (PolyglotException exception) {
            String message = exception.isSyntaxError() ? "Guest syntax error." : "Guest execution failed.";
            if (exception.isResourceExhausted()) {
                message = "Execution exceeded the statement limit.";
            }
            return new Evaluation(Status.ERROR, output.toString(), message, diagnostics.toString());
        }
    }

    private static final class BoundedOutputStream extends java.io.OutputStream {
        private static final byte[] TRUNCATION = "[output truncated]".getBytes(StandardCharsets.UTF_8);
        private final int limit;
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private boolean truncated;

        private BoundedOutputStream(int limit) { this.limit = limit; }

        @Override public void write(int value) {
            if (bytes.size() < limit) bytes.write(value);
            else markTruncated();
        }

        @Override public void write(byte[] value, int offset, int length) {
            int remaining = Math.max(0, limit - bytes.size());
            bytes.write(value, offset, Math.min(length, remaining));
            if (length > remaining) markTruncated();
        }

        private void append(String value) {
            byte[] encoded = value.getBytes(StandardCharsets.UTF_8);
            write(encoded, 0, encoded.length);
        }

        private void markTruncated() {
            if (truncated) return;
            truncated = true;
            byte[] current = bytes.toByteArray();
            int target = Math.max(0, limit - TRUNCATION.length);
            bytes.reset();
            bytes.write(current, 0, Math.min(current.length, target));
            bytes.write(TRUNCATION, 0, Math.min(TRUNCATION.length, limit - bytes.size()));
        }

        private int size() { return bytes.size(); }
        @Override public String toString() { return bytes.toString(StandardCharsets.UTF_8); }
    }

    public record Evaluation(Status status, String output, String error, String diagnostics) {}
    public enum Status { SUCCESS, ERROR }
}
