package com.infotactsolutions.polyglotmesh.runtime;

import static org.springframework.test.web.reactive.server.WebTestClient.bindToController;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class RuntimeCapabilitiesControllerTest {
    private final PolyglotRuntimeService runtimeService = new PolyglotRuntimeService();
    private final org.springframework.test.web.reactive.server.WebTestClient client = bindToController(
            new RuntimeCapabilitiesController(runtimeService)).build();

    @AfterEach
    void closeRuntime() {
        runtimeService.close();
    }

    @Test
    void returnsStructuredLiveRuntimeCapabilities() {
        client.get().uri("/api/runtime/capabilities").exchange()
                .expectStatus().isOk()
                .expectHeader().contentTypeCompatibleWith("application/json")
                .expectBody()
                .jsonPath("$.runtimeName").isNotEmpty()
                .jsonPath("$.status").isEqualTo("INITIALIZED")
                .jsonPath("$.runtimeVersion").isNotEmpty()
                .jsonPath("$.hostJavaVersion").isNotEmpty()
                .jsonPath("$.languages").isArray()
                .jsonPath("$.languages[?(@.id == 'js')].status").isEqualTo("AVAILABLE")
                .jsonPath("$.languages[?(@.id == 'python')].status").isEqualTo("NOT_INSTALLED");
    }
}
