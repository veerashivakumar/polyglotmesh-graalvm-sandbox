package com.infotactsolutions.polyglotmesh.execution;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.infotactsolutions.polyglotmesh.runtime.PolyglotRuntimeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class ExecutionServiceTest {
    private PolyglotRuntimeService runtime;
    private ExecutionService service;

    @BeforeEach void setUp() { runtime = new PolyglotRuntimeService(); service = new ExecutionService(runtime); }
    @AfterEach void tearDown() { service.close(); runtime.close(); }

    @Test void evaluatesJavaScriptAndCapturesConsoleOutputAndValue() {
        var result = service.execute("javascript", "const price = 100; console.log(price * 2); price + 1");
        assertThat(result.status()).isEqualTo(ExecutionResponse.Status.SUCCESS);
        assertThat(result.output()).contains("200", "101");
        assertThat(result.executionTimeMs()).isGreaterThanOrEqualTo(0);
    }

    @Test void reportsGuestSyntaxAndRuntimeErrorsWithoutStackTrace() {
        var syntax = service.execute("javascript", "const = ;");
        assertThat(syntax.status()).isEqualTo(ExecutionResponse.Status.ERROR);
        assertThat(syntax.error()).contains("syntax error").doesNotContain("\tat ");
        var runtimeError = service.execute("javascript", "throw new Error('guest failure')");
        assertThat(runtimeError.status()).isEqualTo(ExecutionResponse.Status.ERROR);
        assertThat(runtimeError.error()).contains("guest failure").doesNotContain("\tat ");
    }

    @Test void rejectsBlankOversizedAndUnsupportedRequests() {
        assertThatThrownBy(() -> service.execute("javascript", " ")).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.execute("javascript", "x".repeat(ExecutionService.MAX_SOURCE_CHARS + 1)))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.execute("python", "print('no')")).isInstanceOf(ResponseStatusException.class);
    }

    @Test void deniesHostClassesAndKeepsSeparateContextState() {
        var restricted = service.execute("javascript", "Java.type('java.lang.System')");
        assertThat(restricted.status()).isEqualTo(ExecutionResponse.Status.ERROR);
        assertThat(service.execute("javascript", "typeof privateValue").output()).isEqualTo("undefined");
        assertThat(service.execute("javascript", "var privateValue = 1; privateValue").output()).isEqualTo("1");
        assertThat(service.execute("javascript", "typeof privateValue").output()).isEqualTo("undefined");
    }

    @Test void deniesFilesystemAndNetworkAccess() {
        assertThat(service.execute("javascript", "Java.type('java.nio.file.Files').readString(Java.type('java.nio.file.Path').of('README.md'))").status())
                .isEqualTo(ExecutionResponse.Status.ERROR);
        assertThat(service.execute("javascript", "Java.type('java.net.Socket').new('example.com', 80)").status())
                .isEqualTo(ExecutionResponse.Status.ERROR);
    }

    @Test void boundsCapturedOutput() {
        var response = service.execute("javascript", "console.log('x'.repeat(20000))");
        assertThat(response.output().length()).isLessThan(ExecutionService.MAX_OUTPUT_BYTES + 100);
        assertThat(response.output()).contains("output truncated");
    }

    @Test void cancelsLongRunningGuestEvaluation() {
        var response = service.execute("javascript", "while (true) { }");
        assertThat(response.status()).isEqualTo(ExecutionResponse.Status.ERROR);
        assertThat(response.error()).containsAnyOf("time limit", "statement limit");
    }
}
