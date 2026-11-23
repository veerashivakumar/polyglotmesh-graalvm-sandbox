package com.infotactsolutions.polyglotmesh.prototype;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class RuntimeCompatibilityPrototypeTest {
    private final RuntimeCompatibilityPrototype prototype = new RuntimeCompatibilityPrototype();

    @Test
    void initializesRuntimeAndEvaluatesJavascriptInFreshRestrictedContext() {
        var result = prototype.executeJavascript("21 * 2");

        assertEquals(RuntimeCompatibilityPrototype.Status.SUCCESS, result.status());
        assertEquals("42", result.output());
        assertNull(result.error());
        org.junit.jupiter.api.Assertions.assertTrue(result.diagnostics().contains("fallback runtime"));
    }

    @Test
    void executesPythonWorkerWithControlledInput() {
        var result = prototype.executePython("PolyglotMesh");

        assertEquals(RuntimeCompatibilityPrototype.Status.SUCCESS, result.status());
        assertEquals("hello PolyglotMesh", result.output().trim());
        assertNull(result.error());
        org.junit.jupiter.api.Assertions.assertTrue(result.diagnostics().contains("JVMCI is not enabled"));
    }

    @Test
    void reportsGuestSyntaxAndRuntimeErrorsWithoutStackTraces() {
        var syntax = prototype.evaluatePythonSource("this is not valid Python");
        var pythonRuntime = prototype.evaluatePythonSource("1 / 0");
        var runtime = prototype.executeJavascript("throw new Error('private details')");

        assertEquals(RuntimeCompatibilityPrototype.Status.ERROR, syntax.status());
        assertEquals("Guest syntax error.", syntax.error());
        assertEquals(RuntimeCompatibilityPrototype.Status.ERROR, pythonRuntime.status());
        assertEquals("Guest execution failed.", pythonRuntime.error());
        assertEquals(RuntimeCompatibilityPrototype.Status.ERROR, runtime.status());
        assertEquals("Guest execution failed.", runtime.error());
    }

    @Test
    void deniesHostClassesAndResetsGuestStateBetweenContexts() {
        var hostAccess = prototype.executeJavascript("Java.type('java.lang.System')");
        var declare = prototype.executeJavascript("var privateValue = 1; privateValue");
        var inspect = prototype.executeJavascript("typeof privateValue");

        assertEquals(RuntimeCompatibilityPrototype.Status.ERROR, hostAccess.status());
        assertEquals("1", declare.output());
        assertEquals("undefined", inspect.output());
    }

    @Test
    void rejectsOutOfRangeWorkerInput() {
        var result = prototype.executePython("x".repeat(257));

        assertEquals(RuntimeCompatibilityPrototype.Status.ERROR, result.status());
        assertEquals("Input must be at most 256 characters and contain no NUL.", result.error());
    }

    @Test
    void deniesPythonFilesystemAccess() {
        var result = prototype.evaluatePythonSource("open('README.md').read()");

        assertEquals(RuntimeCompatibilityPrototype.Status.ERROR, result.status());
        assertEquals("Guest execution failed.", result.error());
    }

    @Test
    void boundsCapturedOutput() {
        var result = prototype.executeJavascript("console.log('x'.repeat(20_000))");

        assertEquals(RuntimeCompatibilityPrototype.Status.SUCCESS, result.status());
        assertEquals(16_384, result.output().length());
        org.junit.jupiter.api.Assertions.assertTrue(result.output().contains("[output truncated]"));
    }
}
